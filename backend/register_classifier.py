import numpy as np
import librosa


def classify_register(y: np.ndarray, sr: int, f0: float, median_freq: float = 0) -> str:
    """
    地声 (chest) / ミックス (mix) / 裏声 (falsetto)
    """
    if f0 <= 0 or len(y) < 512:
        return "unknown"

    chest_score = 0.0
    falsetto_score = 0.0

    # === 1. 倍音比率（重み3.0）===
    fft = np.abs(np.fft.rfft(y))
    freqs = np.fft.rfftfreq(len(y), 1.0 / sr)
    window = max(1, int(40 * len(freqs) / (sr / 2)))

    def get_energy(target_freq):
        if target_freq > sr / 2:
            return 0
        idx = np.argmin(np.abs(freqs - target_freq))
        s = max(0, idx - window)
        e = min(len(fft), idx + window)
        return np.sum(fft[s:e] ** 2)

    fundamental = get_energy(f0) + 1e-10
    h2 = get_energy(f0 * 2)
    h3 = get_energy(f0 * 3)
    h4 = get_energy(f0 * 4)

    harmonic_ratio = (h2 + h3 + h4) / (fundamental * 3)

    if harmonic_ratio > 0.5:
        chest_score += 3.0
    elif harmonic_ratio > 0.25:
        chest_score += 1.0
    elif harmonic_ratio > 0.1:
        falsetto_score += 1.5
    else:
        falsetto_score += 3.0

    # === 2. HNR（重み2.0）===
    harmonic, percussive = librosa.effects.hpss(y)
    h_energy = np.mean(harmonic ** 2) + 1e-10
    p_energy = np.mean(percussive ** 2) + 1e-10
    hnr = 10 * np.log10(h_energy / p_energy)

    if hnr > 12:
        chest_score += 2.0
    elif hnr > 6:
        chest_score += 0.5
    elif hnr > 2:
        falsetto_score += 1.0
    else:
        falsetto_score += 2.0

    # === 3. スペクトル重心比（重み1.5）===
    centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
    centroid_ratio = centroid / f0

    if centroid_ratio > 3.5:
        chest_score += 1.5
    elif centroid_ratio > 2.5:
        chest_score += 0.3
    elif centroid_ratio > 1.8:
        falsetto_score += 0.5
    else:
        falsetto_score += 1.5

    # === 4. スペクトルフラットネス（重み1.5）===
    flatness = np.mean(librosa.feature.spectral_flatness(y=y))

    if flatness < 0.02:
        chest_score += 1.5
    elif flatness < 0.05:
        chest_score += 0.3
    elif flatness < 0.08:
        falsetto_score += 0.5
    else:
        falsetto_score += 1.5

    # === 5. 相対ピッチ判定（重み3.0 ← 最重要）===
    if median_freq > 0:
        midi_diff = librosa.hz_to_midi(f0) - librosa.hz_to_midi(median_freq)
        # 中央値より5半音以上高い → ほぼ裏声
        if midi_diff > 6:
            falsetto_score += 3.0
        elif midi_diff > 4:
            falsetto_score += 2.0
        elif midi_diff > 2:
            falsetto_score += 1.0
        elif midi_diff < -2:
            chest_score += 1.5
        else:
            chest_score += 0.3

    # === 6. スペクトルロールオフ比（重み1.0）===
    rolloff = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85))
    rolloff_ratio = rolloff / f0

    if rolloff_ratio > 5.0:
        chest_score += 1.0
    elif rolloff_ratio > 3.0:
        chest_score += 0.3
    else:
        falsetto_score += 1.0

    # === 判定（裏声寄りに閾値調整）===
    total = chest_score + falsetto_score
    if total == 0:
        return "chest"

    falsetto_ratio = falsetto_score / total

    if falsetto_ratio > 0.50:
        return "falsetto"
    elif falsetto_ratio > 0.35:
        return "mix"
    else:
        return "chest"