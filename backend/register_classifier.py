"""
register_classifier.py  —  地声 / 裏声 判定

【判定方式】
  1. MLモデルが存在する場合 → モデルで推論（6特徴量）
  2. MLモデルがない場合     → ルールベース判定（従来方式）

  MLモデルの学習方法:
    python labeler.py add chest chest_voice.wav
    python labeler.py add falsetto falsetto_voice.wav
    python train_classifier.py
    → models/register_model.joblib が生成される

【ルールベース使用する指標】
  1. H1-H2差（地声即決 + スコア）
  2. hcount（有効倍音本数）
  3. 倍音減衰スロープ
  4. HNR（調波対雑音比）
  5. スペクトル重心/f0
  6. 音域補正（補助のみ）
"""

import os
import numpy as np
import librosa

FALSETTO_HARD_MIN_HZ = 270.0

# ============================================================
# MLモデルのロード（ホットリロード対応）
# ============================================================
_ML_MODEL = None
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "register_model.joblib")
_MODEL_MTIME = 0.0  # モデルファイルの更新日時を記録


def _load_model_if_needed():
    """モデルファイルが更新されていたら再ロード（学習後にサーバー再起動不要）"""
    global _ML_MODEL, _MODEL_MTIME

    if not os.path.exists(_MODEL_PATH):
        if _ML_MODEL is not None:
            print(f"[INFO] MLモデルが削除されました（ルールベースに切替）")
            _ML_MODEL = None
            _MODEL_MTIME = 0.0
        return

    current_mtime = os.path.getmtime(_MODEL_PATH)
    if current_mtime == _MODEL_MTIME and _ML_MODEL is not None:
        return  # 変更なし、キャッシュ済みモデルを使用

    try:
        import joblib
        _ML_MODEL = joblib.load(_MODEL_PATH)
        _MODEL_MTIME = current_mtime
        print(f"[INFO] MLモデルをロード: {_MODEL_PATH}")
    except Exception as e:
        print(f"[WARN] MLモデルのロードに失敗（ルールベースで動作）: {e}")
        _ML_MODEL = None


# 起動時に1回チェック
_load_model_if_needed()


# ============================================================
# 共通特徴量抽出（feature_extractor.pyを使用）
# ============================================================
try:
    from feature_extractor import extract_features
except ImportError:
    extract_features = None


# ============================================================
# ルールベース用のヘルパー（MLモデルがない場合のフォールバック）
# ============================================================
def _get_peak_db(fft: np.ndarray, freqs: np.ndarray,
                 target_hz: float, sr: int) -> float:
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
        if peak > b * 2.0 or peak < 0:
            peak = b
    else:
        peak = b
    return 20.0 * np.log10(max(peak, 1e-10))


def _compute_hnr(y: np.ndarray, sr: int, f0: float) -> float:
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


# ============================================================
# ML推論
# ============================================================
def _classify_ml(y: np.ndarray, sr: int, f0: float) -> str | None:
    """MLモデルで判定。モデルがないか特徴抽出に失敗したら None を返す"""
    _load_model_if_needed()  # モデル更新チェック（mtime比較のみ、軽量）

    if _ML_MODEL is None or extract_features is None:
        return None

    feat = extract_features(y, sr, f0)
    if feat is None:
        return None

    try:
        X = feat.reshape(1, -1)
        proba = _ML_MODEL.predict_proba(X)[0]
        pred = int(np.argmax(proba))
        label = "chest" if pred == 0 else "falsetto"
        confidence = float(proba[pred])

        # 信頼度が低い場合はルールベースにフォールバック
        if confidence < 0.6:
            print(f"[REGISTER/ML] f0={f0:.0f}Hz → {label} conf={confidence:.2f} (低信頼度→ルールへ)")
            return None

        print(f"[REGISTER/ML] f0={f0:.0f}Hz → {label} conf={confidence:.2f}")
        return label
    except Exception as e:
        print(f"[WARN] ML推論失敗: {e}")
        return None


# ============================================================
# ルールベース判定（フォールバック）
# ============================================================
def _classify_rules(y: np.ndarray, sr: int, f0: float, median_freq: float) -> str:
    """従来のルールベース判定"""
    # FFT
    n_fft    = 8192
    win      = np.hanning(len(y))
    y_pad    = np.zeros(n_fft)
    y_pad[:len(y)] = y * win
    fft      = np.abs(np.fft.rfft(y_pad))
    freqs    = np.fft.rfftfreq(n_fft, 1.0 / sr)
    noise_db = 20.0 * np.log10(float(np.percentile(fft, 5)) + 1e-12)

    H  = [_get_peak_db(fft, freqs, f0 * n, sr) for n in range(1, 11)]
    h1 = H[0]

    if h1 <= -60:
        return "unknown"

    h1_h2 = h1 - H[1]

    if h1_h2 < -20.0:
        return "unknown"

    # 地声即決
    if h1_h2 < -2.0:
        print(f"[REGISTER/RULE] f0={f0:.0f}Hz H1-H2={h1_h2:.1f}dB → 地声確定(即決)")
        return "chest"

    # スコア判定
    chest_score    = 0.0
    falsetto_score = 0.0

    # H1-H2
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

    # hcount
    hcount = sum(1 for db in H[:10] if db > noise_db + 8.0)
    if hcount <= 2:
        falsetto_score += 6.0
    elif hcount <= 4:
        falsetto_score += 3.0
    elif hcount >= 8:
        chest_score += 6.0
    elif hcount >= 6:
        chest_score += 3.0

    # slope
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

    # HNR
    hnr = _compute_hnr(y, sr, f0)
    if hnr < 0.35:
        falsetto_score += 4.0
    elif hnr < 0.50:
        falsetto_score += 2.0
    elif hnr > 0.80:
        chest_score += 3.0
    elif hnr > 0.65:
        chest_score += 1.5

    # centroid / f0
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

    # f0補正
    if f0 > 600:
        falsetto_score += 2.0
    elif f0 > 500:
        falsetto_score += 1.0
    elif f0 < 220:
        chest_score += 3.0
    elif f0 < 295:
        chest_score += 1.5

    # 判定
    total = chest_score + falsetto_score
    if total < 1e-6:
        return "chest"

    falsetto_ratio = falsetto_score / total
    result = "falsetto" if falsetto_ratio >= 0.58 else "chest"

    print(
        f"[REGISTER/RULE] f0={f0:.0f}Hz "
        f"H1-H2={h1_h2:.1f} hcount={hcount} "
        f"slope={slope:.1f if slope is not None else 'N/A'} "
        f"HNR={hnr:.2f} cr={cr:.2f} "
        f"C={chest_score:.1f} F={falsetto_score:.1f} ratio={falsetto_ratio:.2f} "
        f"→ {result}"
    )
    return result


# ============================================================
# メインAPI（analyzer.pyから呼ばれる）
# ============================================================
def classify_register(y: np.ndarray, sr: int, f0: float, median_freq: float = 0,
                      already_separated: bool = False) -> str:
    """
    地声/裏声を判定する。

    1. f0 < 270Hz → 地声確定
    2. MLモデルがあればMLで判定
    3. MLがないか低信頼度ならルールベースにフォールバック
    """
    if f0 <= 0 or len(y) < 512:
        return "unknown"

    if f0 < FALSETTO_HARD_MIN_HZ:
        return "chest"

    # ML判定を試行
    ml_result = _classify_ml(y, sr, f0)
    if ml_result is not None:
        return ml_result

    # フォールバック: ルールベース
    return _classify_rules(y, sr, f0, median_freq)