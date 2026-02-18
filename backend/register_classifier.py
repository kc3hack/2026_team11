"""
register_classifier.py  —  地声 / 裏声 判定

【削除した指標: Hhigh (H1 vs H3-H8平均)】
  この指標は実測で信頼できないことが判明:
  - ノイズフロアが低い(-80dB)環境でH3-H8が-70dBのとき
    h1_vs_high = 20-(-70) = 90dB → 誤ってF+5が付く
  - 一方で実際の地声でも40-50dBになることが多く弁別力が低い
  - hcountが同じ情報をより信頼できる形で提供している

【使用する指標】
  1. H1-H2差（即決 + スコア）★最重要
  2. hcount（有効倍音本数）★重要
  3. 倍音減衰スロープ
  4. HNR（調波対雑音比）
  5. スペクトル重心/f0
  6. 音域補正（補助のみ）
"""

import numpy as np
import librosa

FALSETTO_HARD_MIN_HZ = 270.0


def _get_peak_db(fft: np.ndarray, freqs: np.ndarray,
                 target_hz: float, sr: int) -> float:
    """target_hz付近のピークをdBで返す（二次補間あり）"""
    if target_hz <= 0 or target_hz >= sr / 2 * 0.95:
        return -120.0
    half_win = max(10.0, target_hz * 0.035)
    lo = max(1, np.searchsorted(freqs, target_hz - half_win))
    hi = min(len(fft) - 2, np.searchsorted(freqs, target_hz + half_win))
    if lo >= hi:
        return -120.0
    pk  = lo + int(np.argmax(fft[lo:hi + 1]))
    a, b, c = fft[pk - 1], fft[pk], fft[pk + 1]
    denom = a - 2 * b + c

    if abs(denom) > 1e-12:
        offset = 0.5 * (a - c) / denom
        peak   = b - 0.25 * (a - c) * offset
        # ★ 二次補間が発散した場合（窓端のピーク非対称など）は b にフォールバック
        # 物理的に正しい補間ならピークはbを大きく超えない
        if peak > b * 2.0 or peak < 0:
            peak = b
    else:
        peak = b

    return 20.0 * np.log10(max(peak, 1e-10))


def _compute_hnr(y: np.ndarray, sr: int, f0: float) -> float:
    """自己相関ベースHNR (0〜1)。高いほど周期的=地声"""
    try:
        win = np.hanning(len(y))
        ac  = np.correlate(y * win, y * win, mode='full')
        ac  = ac[len(ac) // 2:]
        if ac[0] < 1e-10:
            return 0.5
        ac /= ac[0]
        lag = int(round(sr / f0))
        if lag < 5 or lag >= len(ac) - 5:
            return 0.5
        return float(np.clip(np.max(ac[lag - 3: lag + 4]), 0.0, 1.0))
    except Exception:
        return 0.5


def classify_register(y: np.ndarray, sr: int, f0: float, median_freq: float = 0) -> str:
    if f0 <= 0 or len(y) < 512:
        return "unknown"

    if f0 < FALSETTO_HARD_MIN_HZ:
        return "chest"

    # ===== FFT =====
    n_fft    = 8192
    win      = np.hanning(len(y))
    y_pad    = np.zeros(n_fft)
    y_pad[:len(y)] = y * win
    fft      = np.abs(np.fft.rfft(y_pad))
    freqs    = np.fft.rfftfreq(n_fft, 1.0 / sr)
    noise_db = 20.0 * np.log10(float(np.percentile(fft, 5)) + 1e-12)

    H  = [_get_peak_db(fft, freqs, f0 * n, sr) for n in range(1, 11)]
    h1 = H[0]

    # H1が極端に弱い場合は無声音（息、子音、無音）→ 判定不能
    if h1 <= -60:
        return "unknown"

    h1_h2 = h1 - H[1]

    # H1-H2が極端に低い場合（-20dB未満）は異常データ
    # H2がH1より100倍以上強い = 基音が検出できていない = 無声音
    if h1_h2 < -20.0:
        return "unknown"

    # ============================================================
    # Step 1: H1-H2差による即決判定
    # ============================================================
    if h1_h2 > 10.0:
        print(f"[REGISTER] f0={f0:.0f}Hz H1-H2={h1_h2:.1f}dB → 裏声確定(即決)")
        return "falsetto"

    if h1_h2 < -2.0:
        print(f"[REGISTER] f0={f0:.0f}Hz H1-H2={h1_h2:.1f}dB → 地声確定(即決)")
        return "chest"

    # ============================================================
    # Step 2: スコア判定（H1-H2が -2〜10dB）
    # ============================================================
    chest_score    = 0.0
    falsetto_score = 0.0

    # ---- 指標1: H1-H2差 ----
    if h1_h2 >= 7:
        falsetto_score += 5.0
    elif h1_h2 >= 5:
        falsetto_score += 3.0
    elif h1_h2 >= 3:
        falsetto_score += 1.0
    elif h1_h2 <= 0:
        chest_score += 4.0
    elif h1_h2 <= 2:
        chest_score += 2.0
    # 2〜3dBの場合は加点なし（本当に曖昧な帯域）

    # ---- 指標2: 有効倍音本数（ノイズフロア+8dB超） ----
    # ★ Hhigh(H1-avg)は削除: ノイズフロアの絶対値に依存して信頼できないため
    # hcountが「倍音の豊かさ」を正しく表現している
    hcount = sum(1 for db in H[:10] if db > noise_db + 8.0)
    if hcount <= 2:
        falsetto_score += 6.0
    elif hcount <= 4:
        falsetto_score += 3.0
    elif hcount >= 8:
        chest_score += 6.0
    elif hcount >= 6:
        chest_score += 3.0

    # ---- 指標3: 倍音減衰スロープ ----
    # noise_db+8dB超の倍音のみでスロープを計算（ノイズを除外）
    slope_pts = [(i + 1, H[i]) for i in range(8) if H[i] > noise_db + 8.0]
    if len(slope_pts) >= 3:
        xs    = np.array([p[0] for p in slope_pts], dtype=float)
        ys    = np.array([p[1] for p in slope_pts], dtype=float)
        slope = float(np.polyfit(xs, ys, 1)[0])
        if slope < -10:
            falsetto_score += 3.0
        elif slope < -7:
            falsetto_score += 1.5
        elif slope > -4:
            chest_score += 3.0
        elif slope > -6:
            chest_score += 1.5
    else:
        slope = None

    # ---- 指標4: HNR ----
    hnr = _compute_hnr(y, sr, f0)
    if hnr < 0.35:
        falsetto_score += 4.0
    elif hnr < 0.50:
        falsetto_score += 2.0
    elif hnr > 0.80:
        chest_score += 3.0
    elif hnr > 0.65:
        chest_score += 1.5

    # ---- 指標5: スペクトル重心 / f0 ----
    centroid = float(librosa.feature.spectral_centroid(y=y, sr=sr)[0, 0])
    cr = centroid / f0
    if cr < 2.5:
        falsetto_score += 3.0
    elif cr < 4.0:
        falsetto_score += 1.5
    elif cr > 9.0:
        chest_score += 3.0
    elif cr > 6.5:
        chest_score += 1.5

    # ---- 指標6: 音域補正（補助のみ） ----
    if f0 > 600:
        falsetto_score += 2.0
    elif f0 > 500:
        falsetto_score += 1.0
    elif f0 < 220:
        chest_score += 3.0
    elif f0 < 295:
        chest_score += 1.5

    # ============================================================
    # 最終判定: 閾値 0.58
    # ============================================================
    total = chest_score + falsetto_score
    if total < 1e-6:
        return "chest"

    falsetto_ratio = falsetto_score / total
    result = "falsetto" if falsetto_ratio >= 0.58 else "chest"

    # ★ log_parts[:4]切り捨てをやめて全指標を表示（デバッグ用）
    print(
        f"[REGISTER] f0={f0:.0f}Hz "
        f"H1-H2={h1_h2:.1f} hcount={hcount} "
        f"slope={slope:.1f if slope is not None else 'N/A'} "
        f"HNR={hnr:.2f} cr={cr:.2f} "
        f"C={chest_score:.1f} F={falsetto_score:.1f} ratio={falsetto_ratio:.2f} "
        f"→ {result}"
    )

    return result