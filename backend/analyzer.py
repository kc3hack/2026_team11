"""
backend/analyzer.py — ルートの処理内容に倣った音域解析

ピッチ検出: librosa pyin + yin
レジスター: chest / mix / falsetto（register_classifier）
音名: note_converter.to_japanese_notation
"""
import numpy as np
import librosa
import soundfile as sf
from register_classifier import classify_register
from note_converter import to_japanese_notation


def hz_to_nearest_note_hz(hz: float) -> tuple:
    if hz <= 0:
        return hz, "unknown"
    midi = librosa.hz_to_midi(hz)
    rounded_midi = round(midi)
    corrected_hz = float(librosa.midi_to_hz(rounded_midi))
    note = librosa.midi_to_note(rounded_midi)
    return corrected_hz, note


def load_audio_safe(file_path: str):
    data, sr = sf.read(file_path)
    print(f"[DEBUG] load_audio_safe: SR={sr}, shape={data.shape}, dtype={data.dtype}")
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
    y = data.astype(np.float32)
    return y, sr


def analyze(file_path: str, already_separated: bool = False, no_falsetto: bool = False) -> dict:
    # no_falsetto は backend/main からの互換用（ルートでは未使用）
    _ = no_falsetto

    # === 音声読み込み ===
    y, sr = load_audio_safe(file_path)
    print(f"[DEBUG] Loaded: SR={sr}, duration={len(y)/sr:.2f}s, max={np.max(np.abs(y)):.4f}")

    # === ノイズ除去（軽め・音を消しすぎない）===
    try:
        import noisereduce as nr
        y_denoised = nr.reduce_noise(
            y=y,
            sr=sr,
            prop_decrease=0.5,   # 0.8→0.5 に緩和（音を消しすぎない）
            n_fft=2048,
            hop_length=512,
        )
        # 無音カットは top_db を緩めに
        intervals = librosa.effects.split(y_denoised, top_db=40)  # 30→40 に緩和
        if len(intervals) > 0:
            y_clean = np.concatenate([y_denoised[start:end] for start, end in intervals])
            # カット後が短すぎたら元の音声を使う
            if len(y_clean) >= sr * 0.3:
                y = y_clean
            else:
                y = y_denoised
        else:
            y = y_denoised
    except Exception as e:
        print(f"[DEBUG] Noise reduction failed: {e}")

    print(f"[DEBUG] After denoise: duration={len(y)/sr:.2f}s")

    if len(y) < sr * 0.3:
        return {"error": "録音が短すぎます。3秒以上録音してください。"}

    # === ピッチ検出 ===
    # 短い音声でも動くように frame_length を調整
    audio_length = len(y)
    if audio_length < 4096:
        fl = 2048
    else:
        fl = 4096

    f0_pyin, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
        frame_length=fl,
        hop_length=512,
        fill_na=np.nan,
    )

    f0_yin = librosa.yin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
        frame_length=fl,
        hop_length=512,
    )

    # 統合
    f0 = np.copy(f0_pyin)
    for i in range(min(len(f0_pyin), len(f0_yin))):
        if np.isnan(f0_pyin[i]):
            if 80 < f0_yin[i] < 1500:
                f0[i] = f0_yin[i]
            continue
        pyin_midi = librosa.hz_to_midi(f0_pyin[i])
        yin_midi = librosa.hz_to_midi(f0_yin[i])
        if abs(pyin_midi - yin_midi) < 1.0:
            f0[i] = (f0_pyin[i] + f0_yin[i]) / 2.0

    valid = f0[~np.isnan(f0)]
    if len(valid) == 0:
        return {"error": "音声が検出できませんでした。もう少し大きな声で録音してください。"}

    print(f"[DEBUG] Pitch range: {np.min(valid):.1f}Hz ~ {np.max(valid):.1f}Hz")
    print(f"[DEBUG] Pitch median: {np.median(valid):.1f}Hz, frames: {len(valid)}")

    # === 外れ値除去 ===
    lower = np.percentile(valid, 3)
    upper = np.percentile(valid, 97)
    valid_filtered = valid[(valid >= lower) & (valid <= upper)]
    if len(valid_filtered) < 3:
        valid_filtered = valid

    median_freq = np.median(valid_filtered)

    # === フレームごとに判定 ===
    hop_length = 512
    chest_notes = []
    mix_notes = []
    falsetto_notes = []

    for i, freq in enumerate(f0):
        if np.isnan(freq):
            continue
        if freq < lower or freq > upper:
            continue
        if voiced_prob is not None and i < len(voiced_prob) and voiced_prob[i] < 0.1:
            continue

        start = i * hop_length
        end = start + fl
        if end > len(y):
            end = len(y)
        frame = y[start:end]

        # 短いフレームでも判定する（512以上あればOK）
        if len(frame) < 512:
            # 最低限の周波数ベース判定
            midi_diff = librosa.hz_to_midi(freq) - librosa.hz_to_midi(median_freq)
            if midi_diff > 5:
                falsetto_notes.append(freq)
            elif midi_diff > 2:
                mix_notes.append(freq)
            else:
                chest_notes.append(freq)
            continue

        try:
            register = classify_register(frame, sr, freq, median_freq)
            if register == "chest":
                chest_notes.append(freq)
            elif register == "mix":
                mix_notes.append(freq)
            elif register == "falsetto":
                falsetto_notes.append(freq)
        except Exception:
            continue

    print(f"[DEBUG] chest={len(chest_notes)}, mix={len(mix_notes)}, falsetto={len(falsetto_notes)}")

    # === もし全部空なら、周波数だけで簡易判定 ===
    if len(chest_notes) == 0 and len(mix_notes) == 0 and len(falsetto_notes) == 0:
        print("[DEBUG] All empty, fallback to frequency-only classification")
        for freq in valid_filtered:
            midi_diff = librosa.hz_to_midi(freq) - librosa.hz_to_midi(median_freq)
            if midi_diff > 5:
                falsetto_notes.append(freq)
            elif midi_diff > 2:
                mix_notes.append(freq)
            else:
                chest_notes.append(freq)

    # === 結果構築 ===
    def hz_to_jp(hz):
        corrected_hz, note = hz_to_nearest_note_hz(hz)
        return to_japanese_notation(note), round(corrected_hz, 1)

    min_note, min_hz = hz_to_jp(np.min(valid_filtered))
    max_note, max_hz = hz_to_jp(np.max(valid_filtered))

    result = {
        "overall_min": min_note,
        "overall_max": max_note,
        "overall_min_hz": min_hz,
        "overall_max_hz": max_hz,
    }

    def add_range(notes, prefix):
        if not notes:
            return
        arr = np.array(notes)
        if len(arr) >= 10:
            lo = np.percentile(arr, 3)
            hi = np.percentile(arr, 97)
            arr = arr[(arr >= lo) & (arr <= hi)]
        if len(arr) == 0:
            return
        lo_note, lo_hz = hz_to_jp(np.min(arr))
        hi_note, hi_hz = hz_to_jp(np.max(arr))
        result[f"{prefix}_min"] = lo_note
        result[f"{prefix}_max"] = hi_note
        result[f"{prefix}_min_hz"] = lo_hz
        result[f"{prefix}_max_hz"] = hi_hz
        result[f"{prefix}_count"] = len(arr)

    add_range(chest_notes, "chest")
    add_range(mix_notes, "mix")
    add_range(falsetto_notes, "falsetto")

    total = len(chest_notes) + len(mix_notes) + len(falsetto_notes)
    if total > 0:
        result["chest_ratio"] = round(len(chest_notes) / total * 100, 1)
        result["mix_ratio"] = round(len(mix_notes) / total * 100, 1)
        result["falsetto_ratio"] = round(len(falsetto_notes) / total * 100, 1)

    # backend/main の _enrich_result 用（おすすめ曲・声質タイプで使用）
    if chest_notes:
        result["chest_avg_hz"] = round(float(np.mean(chest_notes)), 1)
    else:
        result["chest_avg_hz"] = 0.0

    return result
