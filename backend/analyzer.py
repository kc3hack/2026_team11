import numpy as np
import soundfile as sf
import torch
import torchcrepe
import librosa
from register_classifier import classify_register
from note_converter import hz_to_label_and_hz

FALSETTO_DISPLAY_MIN_HZ = 330.0  # mid2E: 裏声の生理的下限
# 330Hz未満の裏声判定は息混じりの地声やウィスパーボイスの可能性が高いため
# 地声に再分類する（register_classifier.pyのFALSETTO_HARD_MIN_HZ=270Hzとは別）


# ============================================================
# fix_octave_errors
# レジスター判定・中央値計算用のオクターブ修正
# ★ min/maxには使わない（中央値に引き寄せて正しい最高音を削ってしまうため）
# ============================================================
def fix_octave_errors(f0: np.ndarray, conf: np.ndarray) -> np.ndarray:
    if len(f0) < 5:
        return f0.copy()
    f0_fixed  = f0.copy()
    hc        = conf >= 0.5
    reference = np.median(f0[hc]) if hc.sum() >= 5 else np.median(f0)
    VOICE_MIN, VOICE_MAX = 65.0, 1324.0

    for i, freq in enumerate(f0_fixed):
        if freq <= 0:
            continue
        # 高音保護: 中央値の1.5倍以上かつ人声範囲内かつ高信頼度 → 正当な高音跳躍なので補正しない
        # ノイズフレーム(conf<0.5)は保護せずオクターブ補正の対象に残す
        # ★ 旧閾値2.0xではmedian≈200Hzの場合300-400Hz(mid2E~mid2G)が保護されず半減されていた
        if freq > reference * 1.5 and VOICE_MIN <= freq <= VOICE_MAX and conf[i] >= 0.5:
            continue
        doubled, halved = freq * 2, freq / 2
        can_up   = VOICE_MIN <= doubled <= VOICE_MAX
        can_down = VOICE_MIN <= halved  <= VOICE_MAX
        d_orig   = abs(freq    - reference)
        d_up     = abs(doubled - reference) if can_up   else float('inf')
        d_down   = abs(halved  - reference) if can_down else float('inf')
        if can_up   and d_up   < d_orig and d_up   < d_down: f0_fixed[i] = doubled
        elif can_down and d_down < d_orig and d_down < d_up:  f0_fixed[i] = halved
    return f0_fixed


# ============================================================
# remove_unrealistic_range
# 非対称フィルタ: 下限は厳格（サブハーモニクス除去）、上限は緩和（高音保持）
# ============================================================
def remove_unrealistic_range(f0: np.ndarray, conf: np.ndarray) -> tuple:
    if len(f0) < 5:
        return f0.copy(), conf.copy()
    hc     = conf >= 0.3
    median = np.median(f0[hc]) if hc.sum() >= 3 else np.median(f0)
    lower_factor = 2 ** 1.5   # 下限: 1.5オクターブ下（サブハーモニクス誤検出を除去）
    upper_factor = 2 ** 2.0   # 上限: 2.0オクターブ上（高音保持しつつノイズ抑制）
    mask = (f0 >= median / lower_factor) & (f0 <= median * upper_factor)
    return f0[mask], conf[mask]


# ============================================================
# remove_isolated_extremes
# 孤立した極端な高音フレームを除去（ノイズ対策の最終防衛線）
# ============================================================
def remove_isolated_extremes(notes, min_neighbors=4):
    """孤立した極端値を除去。1半音以内にmin_neighbors未満のフレームは除外"""
    if len(notes) < min_neighbors:
        return notes
    arr = np.array(notes)
    median_val = np.median(arr)
    # 中央値の1.5倍以上のフレームのみチェック（低音側は対象外）
    high_threshold = median_val * 1.5
    semitone = 2 ** (1 / 12)  # ≈1.0595
    result = []
    removed = 0
    for f in notes:
        if f < high_threshold:
            result.append(f)
            continue
        # 1半音以内の近傍フレーム数をカウント
        neighbors = sum(1 for x in notes if f / semitone <= x <= f * semitone)
        if neighbors >= min_neighbors:
            result.append(f)
        else:
            removed += 1
    if removed > 0:
        print(f"[DEBUG] 孤立フレーム除去: {removed}フレーム削除 (閾値={high_threshold:.1f}Hz以上, 近傍{min_neighbors}未満)")
    return result if result else notes  # 全除去を防止


# ============================================================
# remove_statistical_outliers
# パーセンタイルベースの外れ値除去（ノイズ・伴奏混入の安全ネット）
# ============================================================
def remove_statistical_outliers(notes, percentile=97, max_semitones_gap=6):
    """主要分布から大きく離れたフレームを除去。
    P{percentile}から{max_semitones_gap}半音以上離れたフレームを外れ値とする。"""
    if len(notes) < 10:
        return notes
    arr = np.array(notes)
    ref = np.percentile(arr, percentile)
    threshold = ref * (2 ** (max_semitones_gap / 12))
    result = [f for f in notes if f <= threshold]
    removed = len(notes) - len(result)
    if removed > 0:
        print(f"[DEBUG] 統計外れ値除去: {removed}フレーム削除 "
              f"(参照P{percentile}={ref:.1f}Hz, 閾値={threshold:.1f}Hz)")
    return result if result else notes  # 全除去を防止


# ============================================================
# check_octave_by_spectrum
# CREPEがviterbi平滑化で1オクターブ低く検出した場合の補正
#
# ★ 閾値を1.2に修正（旧: 0.5）
#
# 理由:
#   真の基音がcandidate_hz の場合:
#     doubled(=H2) のエネルギーは H1 より低い(ratio < 1.0)
#   真の基音がdoubled の場合:
#     doubled(=真H1) のエネルギーは candidate_hz(=サブハーモニック) より
#     ずっと強い(ratio >> 1.0)
#
#   旧閾値 0.5 → H2が自然に-6dBあるだけで誤発火していた
#   新閾値 1.2 → doubledが明確に強い場合のみ補正
# ============================================================
def check_octave_by_spectrum(y_seg: np.ndarray, sr: int, candidate_hz: float) -> float:
    doubled = candidate_hz * 2
    if doubled > sr / 2 * 0.9 or doubled > 1324 or len(y_seg) < 512:
        return candidate_hz

    n_fft = 8192
    win   = np.hanning(min(len(y_seg), n_fft))
    y_w   = np.zeros(n_fft)
    n     = min(len(y_seg), n_fft)
    y_w[:n] = y_seg[:n] * win[:n]
    fft   = np.abs(np.fft.rfft(y_w))
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)

    def band_energy(hz, width=0.04):
        if hz <= 0 or hz >= sr / 2:
            return 0.0
        lo = np.searchsorted(freqs, hz * (1 - width))
        hi = np.searchsorted(freqs, hz * (1 + width))
        return float(np.max(fft[lo:hi])) if lo < hi else 0.0

    e_candidate = band_energy(candidate_hz)
    e_doubled   = band_energy(doubled)

    if e_candidate <= 1e-10:
        return candidate_hz

    ratio = e_doubled / e_candidate
    # doubled が candidate より明確に強い場合のみ補正（閾値1.2）
    if ratio >= 1.2:
        print(f"[DEBUG] 最高音オクターブ修正: {candidate_hz:.1f}→{doubled:.1f}Hz ratio={ratio:.2f}")
        return doubled
    return candidate_hz


# ============================================================
# get_min_max_from_crepe
# ============================================================
def get_min_max_from_crepe(f0: np.ndarray, conf: np.ndarray,
                            y_16k: np.ndarray = None,
                            sr_crepe: int = 16000,
                            hop_length: int = 80,
                            valid_indices: np.ndarray = None) -> tuple:
    """
    CREPEのconfidenceを使ってmin/maxを取得。

    valid_indices: f0がf0_np[valid_indices]で作られた場合に、
                   y_16k上の正しい位置を計算するために必要。
                   Noneの場合はf0内のローカルインデックスを使用（不正確）。
    """
    if len(f0) == 0:
        return 0.0, 0.0

    # ---- 最高音: conf >= 0.3 の最大値 ----
    for max_th in [0.3, 0.15, 0.05]:
        mask_max = conf >= max_th
        if mask_max.sum() >= 1:
            break
    raw_max = float(np.max(f0[mask_max]))

    # スペクトルでオクターブ補正
    if y_16k is not None:
        # mask_max内で最大f0を持つフレームのローカルインデックス
        local_indices_max = np.where(mask_max)[0]
        local_max_idx     = local_indices_max[np.argmax(f0[local_indices_max])]
        # ★ valid_indicesがあれば元のフレーム番号に変換、なければローカルをそのまま使う
        if valid_indices is not None:
            orig_frame_idx = int(valid_indices[local_max_idx])
        else:
            orig_frame_idx = int(local_max_idx)
        center    = orig_frame_idx * hop_length
        seg       = y_16k[max(0, center - 4096): min(len(y_16k), center + 4096)]
        raw_max   = check_octave_by_spectrum(seg, sr_crepe, raw_max)

    # ---- 最低音: conf >= 0.5 の最小値 ----
    for min_th in [0.5, 0.35, 0.2, 0.1]:
        mask_min = conf >= min_th
        if mask_min.sum() >= 3:
            break
    overall_min = float(np.min(f0[mask_min]))

    print(f"[DEBUG] max_th={max_th:.2f} min_th={min_th:.2f} "
          f"max_frames={mask_max.sum()} min_frames={mask_min.sum()} "
          f"raw_min={overall_min:.1f} raw_max={raw_max:.1f}")
    return overall_min, raw_max


# ============================================================
# run_crepe
# ============================================================
def run_crepe(audio_tensor, sr, hop_length, device, model_size='tiny'):
    common = dict(
        audio=audio_tensor, sample_rate=sr, hop_length=hop_length,
        fmin=65, fmax=1400, model=model_size,
        batch_size=2048, device=device, return_periodicity=True,
    )
    # 高速化: weighted_argmax優先（viterbiより2-3倍高速）
    for name, get_dec in [
        ("weighted_argmax", lambda: torchcrepe.decode.weighted_argmax),
        ("viterbi",         lambda: torchcrepe.decode.viterbi),
        ("none",            None),
    ]:
        try:
            print(f"[DEBUG] デコーダー '{name}' で試行中...")
            kw = {**common, "decoder": get_dec()} if get_dec else common
            f0, conf = torchcrepe.predict(**kw)
            print(f"[INFO] ✅ CREPE ({model_size}, {name}) 成功")
            return f0, conf
        except (AttributeError, TypeError) as e:
            print(f"[WARN] ⚠️ decoder={name} 失敗: {e}")
        except Exception:
            raise
    raise RuntimeError("torchcrepe: 全デコーダーで失敗")


# ============================================================
# analyze
# ============================================================
def analyze(wav_path: str, already_separated: bool = False) -> dict:
    print(f"\n{'='*60}")
    print(f"[INFO] 🎵 分析開始: {wav_path}")
    print(f"{'='*60}")

    print(f"[STEP 1/7] 📁 WAVファイル読み込み中...")
    try:
        y, sr = sf.read(wav_path)
        if len(y.shape) > 1:
            print(f"[INFO] ステレオをモノラルに変換中...")
            y = np.mean(y, axis=1)
        y = y.astype(np.float32)
    except Exception as e:
        return {"error": f"WAVファイルの読み込みに失敗しました: {str(e)}"}

    duration = len(y) / sr
    print(f"[DEBUG] ✅ 読込完了: SR={sr}, duration={duration:.2f}s, max={np.max(np.abs(y)):.4f}")

    if duration < 0.3:
        return {"error": "音声が短すぎます（0.3秒以上必要）。"}
    if np.max(np.abs(y)) < 0.0001:
        return {"error": "音が小さすぎます（ほぼ無音）。"}

    print(f"\n[STEP 2/7] 🔧 音声前処理中...")
    print(f"[INFO] 音量正規化中... (目標: 0.95)")
    y = y / (np.max(np.abs(y)) + 1e-8) * 0.95

    sr_crepe     = 16000
    print(f"[INFO] リサンプリング中: {sr}Hz → {sr_crepe}Hz")
    y_16k        = librosa.resample(y, orig_sr=sr, target_sr=sr_crepe) if sr != sr_crepe else y.copy()
    hop_length   = 160  # 10ms (高速化: フレーム数半減)
    device       = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"[INFO] デバイス: {device.upper()} (hop_length={hop_length}ms → フレーム数半減)")
    audio_tensor = torch.tensor(np.copy(y_16k)).unsqueeze(0)
    print(f"[DEBUG] ✅ 前処理完了: tensor shape={audio_tensor.shape}")

    print(f"\n[STEP 3/7] 🎼 CREPE音高推定中...")
    f0_raw = conf_raw = None
    # まず最軽量の'tiny'を試し、失敗した場合は段階的なフォールバックとして'small'を使用
    for model_size in ['tiny', 'small']:
        try:
            print(f"[INFO] CREPEモデル '{model_size}' で試行中... (device={device})")
            f0_raw, conf_raw = run_crepe(audio_tensor, sr_crepe, hop_length, device, model_size)
            print(f"[DEBUG] ✅ CREPE ({model_size}) 成功")
            break
        except Exception as e:
            print(f"[ERROR] ❌ CREPE ({model_size}) 失敗: {type(e).__name__}: {e}")

    if f0_raw is None:
        return {"error": "解析エンジン(CREPE)の実行に失敗しました。"}

    f0_np   = f0_raw.squeeze().detach().cpu().numpy()
    conf_np = conf_raw.squeeze().detach().cpu().numpy()
    print(f"[DEBUG] CREPE完了: frames={len(f0_np)} conf_max={np.max(conf_np):.4f} conf_mean={np.mean(conf_np):.4f}")

    print(f"\n[STEP 4/7] 🎯 信頼度フィルタリング中...")
    # --- confidence フィルタ ---
    for th in [0.5, 0.35, 0.2, 0.1, 0.05, 0.01]:
        idx = np.where(conf_np >= th)[0]
        if len(idx) >= 5:
            valid_indices = idx
            print(f"[INFO] ✅ 有効フレーム検出: {len(idx)}個 (confidence threshold={th:.2f})")
            break
    else:
        return {"error": f"歌声が検出できませんでした。(conf_max={np.max(conf_np):.4f})"}

    f0_v   = f0_np[valid_indices].copy()
    conf_v = conf_np[valid_indices].copy()

    print(f"[INFO] 人声音域フィルタ適用中 (65Hz - 1324Hz)...")
    # --- 人声絶対範囲 ---
    mask   = (f0_v >= 65) & (f0_v <= 1324)
    f0_v   = f0_v[mask]
    conf_v = conf_v[mask]
    # valid_indicesもマスクに合わせて更新（★インデックスずれバグ修正）
    valid_indices_filtered = valid_indices[mask]
    print(f"[DEBUG] ✅ 人声範囲内: {len(f0_v)}フレーム")

    if len(f0_v) == 0:
        return {"error": "人声の音域範囲内の音が検出できませんでした。"}

    print(f"\n[STEP 5/7] 📊 音域データ処理中...")
    # --- レジスター判定用フィルタ（min/maxとは独立） ---
    print(f"[INFO] 異常値除去中 (下1.5oct / 上2.0oct)...")
    f0_reg, conf_reg = remove_unrealistic_range(f0_v, conf_v)
    if len(f0_reg) == 0:
        return {"error": "有効な音域データが残りませんでした。"}
    print(f"[DEBUG] ✅ 残留フレーム: {len(f0_reg)}個")

    # remove_unrealistic_range後もvalid_indicesを対応させる
    # remove_unrealistic_rangeの戻り値はマスク適用後なので再計算（非対称フィルタに合わせる）
    lower_factor = 2 ** 1.5
    upper_factor = 2 ** 2.0
    hc      = conf_v >= 0.3
    median0 = np.median(f0_v[hc]) if hc.sum() >= 3 else np.median(f0_v)
    reg_mask = (f0_v >= median0 / lower_factor) & (f0_v <= median0 * upper_factor)
    valid_indices_reg = valid_indices_filtered[reg_mask]

    print(f"[INFO] オクターブエラー修正中...")
    f0_reg_fixed = fix_octave_errors(f0_reg, conf_reg)

    # 信頼度重み付き中央値
    print(f"[INFO] 中央値計算中...")
    sort_idx    = np.argsort(f0_reg_fixed)
    cum_conf    = np.cumsum(conf_reg[sort_idx])
    mid_idx     = np.searchsorted(cum_conf, cum_conf[-1] / 2)
    median_freq = f0_reg_fixed[sort_idx[mid_idx]]
    print(f"[DEBUG] ✅ 中央値={median_freq:.1f} Hz, レジスター判定フレーム数={len(f0_reg_fixed)}")

    print(f"\n[STEP 6/7] 🎤 レジスター判定中...")
    # === レジスター判定 ===
    # ★ valid_indices_reg と f0_reg_fixed が同じ長さで完全対応
    chest_notes    = []
    falsetto_notes = []
    frame_len      = 2048
    total_frames   = len(f0_reg_fixed)
    progress_interval = max(1, total_frames // 10)  # 10%ごとに進捗表示

    graduated_conf_filtered = 0
    print(f"[INFO] {total_frames}フレームを処理中...")
    for i in range(len(f0_reg_fixed)):
        if i % progress_interval == 0 and i > 0:
            progress = (i / total_frames) * 100
            print(f"[INFO] 進捗: {progress:.0f}% ({i}/{total_frames}) - 地声:{len(chest_notes)} 裏声:{len(falsetto_notes)}")
        freq = f0_reg_fixed[i]
        if not (65 <= freq <= 1324):
            continue
        # --- 段階的信頼度要求: 中央値から遠いほど高い信頼度を要求 ---
        # ★ CREPE元値(f0_reg[i])を使い、fix_octave_errorsで補正されたノイズも検出
        orig_freq = f0_reg[i]
        if orig_freq > median_freq:
            octaves_above = np.log2(orig_freq / median_freq)
            if octaves_above > 1.5:
                min_conf = 0.65
            elif octaves_above > 1.0:
                min_conf = 0.50
            else:
                min_conf = 0.35  # 既存ノイズゲートと同じ
            if conf_reg[i] < min_conf:
                graduated_conf_filtered += 1
                continue
        frame_idx = valid_indices_reg[i]
        center    = int(frame_idx) * hop_length
        start     = max(0, center - frame_len // 2)
        end       = min(len(y_16k), center + frame_len // 2)
        frame     = y_16k[start:end]
        if len(frame) < 512:
            continue
        try:
            reg = classify_register(frame, sr_crepe, freq, median_freq, already_separated,
                                    crepe_conf=float(conf_reg[i]))
            if reg == "falsetto":
                falsetto_notes.append(freq)
            elif reg == "chest":
                chest_notes.append(freq)
            # reg == "unknown" はスキップ（無声音・異常データ）
        except Exception:
            continue

    if graduated_conf_filtered > 0:
        print(f"[DEBUG] 段階的信頼度フィルタ: {graduated_conf_filtered}フレーム除外")

    # 裏声表示フィルタ: 330Hz未満の「裏声」は息混じり地声の可能性が高い
    display_min_hz = FALSETTO_DISPLAY_MIN_HZ
    falsetto_orig  = list(falsetto_notes)
    falsetto_notes = [f for f in falsetto_orig if f >= display_min_hz]
    low_falsetto   = [f for f in falsetto_orig if f < display_min_hz]
    chest_notes.extend(low_falsetto)
    if low_falsetto:
        print(f"[DEBUG] {len(low_falsetto)}フレームを裏声→地声に再分類")

    if not chest_notes and not falsetto_notes:
        print(f"[WARN] レジスター判定結果なし。全フレームを地声として処理")
        chest_notes = f0_reg_fixed.tolist()

    # デバッグ: 最高音付近（上位10Hz）の判定状況を確認
    if chest_notes or falsetto_notes:
        all_freqs = chest_notes + falsetto_notes
        if all_freqs:
            max_freq = max(all_freqs)
            high_threshold = max_freq - 10  # 最高音から10Hz以内
            high_chest = [f for f in chest_notes if f >= high_threshold]
            high_falsetto = [f for f in falsetto_notes if f >= high_threshold]
            print(f"[DEBUG] 最高音付近（{high_threshold:.1f}Hz以上）: 地声{len(high_chest)}フレーム, 裏声{len(high_falsetto)}フレーム")
            if high_chest and high_falsetto:
                print(f"[DEBUG] → 地声最高: {max(high_chest):.1f}Hz, 裏声最高: {max(high_falsetto):.1f}Hz")

    # === 統計的外れ値除去（パーセンタイルベースの安全ネット） ===
    chest_notes = remove_statistical_outliers(chest_notes)
    # ★ 裏声は地声より狭い分布が期待される＋伴奏混入は上端に集中するため厳しめに
    # P90+2半音: 主要分布の上端から全音以上離れたフレームを除去
    # (裏声分布はP90付近に集中するため、楽器混入は2半音で十分に検出可能)
    falsetto_notes = remove_statistical_outliers(falsetto_notes, percentile=90, max_semitones_gap=2)

    # === 孤立した極端値を除去（ノイズ最終防衛線） ===
    chest_notes = remove_isolated_extremes(chest_notes)
    falsetto_notes = remove_isolated_extremes(falsetto_notes)

    # === 最高音付近の混在判定を解消 ===
    # 半音ベースの除外: 2半音分（音名が異なることを保証）
    if chest_notes and falsetto_notes:
        all_freqs = chest_notes + falsetto_notes
        max_freq = max(all_freqs)
        cleanup_factor = 2 ** (2 / 12)  # 2半音 ≈ 1.1225
        high_range_threshold = max_freq / cleanup_factor

        high_chest_frames = [f for f in chest_notes if f >= high_range_threshold]
        high_falsetto_frames = [f for f in falsetto_notes if f >= high_range_threshold]

        # 両方存在する場合、最高音付近では裏声を優先（高音は裏声で出すのが自然）
        if high_chest_frames and high_falsetto_frames:
            chest_notes = [f for f in chest_notes if f < high_range_threshold]
            print(f"[INFO] 最高音付近の地声{len(high_chest_frames)}フレームを除外（裏声{len(high_falsetto_frames)}フレームを優先採用）")

        # ラベル変換後の安全チェック: 量子化で同じ音名になるケースを防止
        if chest_notes and falsetto_notes:
            f_label, _ = hz_to_label_and_hz(max(falsetto_notes))
            c_label, _ = hz_to_label_and_hz(max(chest_notes))
            if c_label == f_label:
                before_count = len(chest_notes)
                chest_notes = [f for f in chest_notes
                               if hz_to_label_and_hz(f)[0] != f_label]
                removed = before_count - len(chest_notes)
                print(f"[INFO] ラベル一致'{c_label}'の地声{removed}フレームを除外")

    print(f"\n[STEP 7/7] 📋 結果集計中...")
    # === overall_min/max はレジスター判定済みnotesから取る ===
    # get_min_max_from_crepeはconf閾値が異なるため「どこから来たか分からない数字」になる
    # 判定済みnotesのmin/maxなら表示されている数字と完全に一致する
    all_notes   = chest_notes + falsetto_notes
    overall_min = float(np.min(all_notes))
    overall_max = float(np.max(all_notes))
    print(f"[DEBUG] 全体音域: min={overall_min:.1f}Hz max={overall_max:.1f}Hz")

    # === 結果構築 ===
    def to_label(hz):
        return hz_to_label_and_hz(hz)

    result = {}

    # 地声の平均Hz（おすすめ曲のマッチングに使用）
    chest_avg_hz = float(np.mean(chest_notes)) if chest_notes else 0.0

    def add_range(notes, prefix):
        if not notes:
            return
        arr = np.array(notes)
        lo_label, lo_hz = to_label(float(np.min(arr)))
        hi_label, hi_hz = to_label(float(np.max(arr)))
        result[f"{prefix}_min"]    = lo_label
        result[f"{prefix}_max"]    = hi_label
        result[f"{prefix}_min_hz"] = lo_hz
        result[f"{prefix}_max_hz"] = hi_hz
        result[f"{prefix}_count"]  = len(arr)

    add_range(chest_notes,    "chest")
    add_range(falsetto_notes, "falsetto")

    # デバッグ: 地声と裏声の最高音Hz値を出力
    if chest_notes and falsetto_notes:
        chest_max_hz = float(np.max(chest_notes))
        falsetto_max_hz = float(np.max(falsetto_notes))
        print(f"[DEBUG] 地声最高音: {chest_max_hz:.1f}Hz, 裏声最高音: {falsetto_max_hz:.1f}Hz")
        if abs(chest_max_hz - falsetto_max_hz) < 5:
            print(f"[WARN] ⚠️ 地声と裏声の最高音が近い（差: {abs(chest_max_hz - falsetto_max_hz):.1f}Hz）")

    ovr_min_label, ovr_min_hz = to_label(overall_min)
    ovr_max_label, ovr_max_hz = to_label(overall_max)
    result["overall_min"]    = ovr_min_label
    result["overall_max"]    = ovr_max_label
    result["overall_min_hz"] = ovr_min_hz
    result["overall_max_hz"] = ovr_max_hz

    total = len(chest_notes) + len(falsetto_notes)
    result["chest_ratio"]    = round(len(chest_notes)    / total * 100, 1) if total else 100.0
    result["falsetto_ratio"] = round(len(falsetto_notes) / total * 100, 1) if total else 0.0
    result["chest_avg_hz"]   = round(chest_avg_hz, 1)

    # === 歌唱力分析 ===
    try:
        from recommender import analyze_singing_ability
        result["singing_analysis"] = analyze_singing_ability(
            f0_array=f0_reg_fixed,
            conf_array=conf_reg,
            chest_notes=chest_notes,
            falsetto_notes=falsetto_notes,
            overall_min_hz=overall_min,
            overall_max_hz=overall_max,
        )
    except Exception as e:
        print(f"[WARN] 歌唱力分析スキップ: {e}")

    print(f"\n{'='*60}")
    print(f"[INFO] ✅ 解析完了!")
    print(f"{'='*60}")
    print(f"📊 最終結果:")
    print(f"  全体音域: {result.get('overall_min', 'N/A')} - {result.get('overall_max', 'N/A')}")
    if 'chest_min' in result:
        print(f"  地声音域: {result.get('chest_min', 'N/A')} - {result.get('chest_max', 'N/A')} ({result.get('chest_ratio', 0)}%)")
    if 'falsetto_min' in result:
        print(f"  裏声音域: {result.get('falsetto_min', 'N/A')} - {result.get('falsetto_max', 'N/A')} ({result.get('falsetto_ratio', 0)}%)")
    print(f"{'='*60}\n")
    return result