"""
register_classifier.py — 地声 / ミックス / 裏声 判定

【判定方式】
  1. MLモデルが存在し、かつ信頼度が閾値以上 → MLで判定（chest / falsetto の2クラス）
  2. 上記以外 → ルールベース（ルート準拠: chest / mix / falsetto の3クラス）

MLモデルの学習方法:
  python labeler.py add chest chest_voice.wav
  python labeler.py add falsetto falsetto_voice.wav
  python train_classifier.py
  → ml/models/register_model.joblib が生成される

ルールベース（ルート準拠）:
  倍音比率・HNR・スペクトル重心・フラットネス・相対ピッチ・ロールオフでスコア化し、
  falsetto_ratio > 0.50 → falsetto, > 0.35 → mix, else → chest
"""

import os
import numpy as np
import librosa

from config import (
    FALSETTO_HARD_MIN_HZ,
    ML_CONF_THRESHOLD_LOW_F0, ML_CONF_THRESHOLD_HIGH,
    ML_CONF_THRESHOLD_NOISY, ML_CONF_CHEST_HIGH_F0,
    CREPE_NOISE_GATE,
    REGISTER_LOG_LEVEL, REGISTER_LOG_INTERVAL,
)

# ============================================================
# MLモデルのロード（ホットリロード対応）
# ============================================================
_ML_MODEL = None
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml", "models", "register_model.joblib")
_MODEL_MTIME = 0.0
_ML_STATUS_LOGGED = False

_log_counter = 0
_stats = {"ml_success": 0, "ml_fallback": 0, "rule_only": 0, "chest": 0, "mix": 0, "falsetto": 0}


def _load_model_if_needed():
    """モデルファイルが更新されていたら再ロード"""
    global _ML_MODEL, _MODEL_MTIME

    if not os.path.exists(_MODEL_PATH):
        if _ML_MODEL is not None:
            print(f"[INFO] MLモデルが削除されました（ルールベースに切替）")
            _ML_MODEL = None
            _MODEL_MTIME = 0.0
        return

    current_mtime = os.path.getmtime(_MODEL_PATH)
    if current_mtime == _MODEL_MTIME and _ML_MODEL is not None:
        return

    try:
        import joblib
        _ML_MODEL = joblib.load(_MODEL_PATH)
        _MODEL_MTIME = current_mtime
        print(f"[INFO] MLモデルをロード: {_MODEL_PATH}")
    except Exception as e:
        print(f"[WARN] MLモデルのロードに失敗（ルールベースで動作）: {e}")
        _ML_MODEL = None


_load_model_if_needed()


# ============================================================
# 共通特徴量（ML用）
# ============================================================
try:
    from feature_extractor import extract_features
except ImportError:
    extract_features = None


# ============================================================
# ML推論（2クラス: chest / falsetto）
# ============================================================
def _classify_ml(y: np.ndarray, sr: int, f0: float,
                  crepe_conf: float = 1.0) -> str | None:
    """MLモデルで判定。モデルがないか特徴抽出に失敗したら None を返す"""
    global _log_counter, _stats
    _load_model_if_needed()

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

        if f0 < 500:
            threshold = ML_CONF_THRESHOLD_LOW_F0
        elif crepe_conf < 0.55:
            threshold = ML_CONF_THRESHOLD_NOISY
        else:
            threshold = ML_CONF_THRESHOLD_HIGH

        if label == "chest" and f0 >= 400:
            threshold = max(threshold, ML_CONF_CHEST_HIGH_F0)

        if confidence < threshold:
            _stats["ml_fallback"] += 1
            if REGISTER_LOG_LEVEL >= 3 or (REGISTER_LOG_LEVEL == 2 and _log_counter % REGISTER_LOG_INTERVAL == 0):
                print(f"[REGISTER/ML→RULE] f0={f0:.0f}Hz ML={label}({confidence:.3f}) < thresh={threshold:.2f} → ルールベースへ")
            return None

        _stats["ml_success"] += 1
        _stats[label] += 1
        if REGISTER_LOG_LEVEL >= 3 or (REGISTER_LOG_LEVEL == 2 and _log_counter % REGISTER_LOG_INTERVAL == 0):
            print(f"[REGISTER/ML] f0={f0:.0f}Hz label={label} conf={confidence:.3f} thresh={threshold:.2f} crepe={crepe_conf:.2f}")
        return label
    except Exception as e:
        print(f"[WARN] ML推論失敗: {e}")
        return None


# ============================================================
# ルールベース（ルート準拠: chest / mix / falsetto 3クラス）
# ============================================================
def _classify_rules(y: np.ndarray, sr: int, f0: float, median_freq: float = 0,
                    crepe_conf: float = 1.0) -> str:
    """
    ルートの register_classifier に準拠した判定。
    倍音比率・HNR・スペクトル重心・フラットネス・相対ピッチ・ロールオフでスコア化。
    """
    global _log_counter, _stats

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

    # === 5. 相対ピッチ判定（重み3.0）===
    if median_freq > 0:
        midi_diff = librosa.hz_to_midi(f0) - librosa.hz_to_midi(median_freq)
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

    # === 判定（ルートと同じ閾値: 裏声寄りに調整）===
    total = chest_score + falsetto_score
    if total == 0:
        result = "chest"
    else:
        falsetto_ratio = falsetto_score / total
        if falsetto_ratio > 0.50:
            result = "falsetto"
        elif falsetto_ratio > 0.35:
            result = "mix"
        else:
            result = "chest"

    _stats["rule_only"] += 1
    _stats[result] += 1
    if REGISTER_LOG_LEVEL >= 3 or (REGISTER_LOG_LEVEL == 2 and _log_counter % REGISTER_LOG_INTERVAL == 0):
        print(f"[REGISTER/RULE] f0={f0:.0f}Hz C={chest_score:.1f} F={falsetto_score:.1f} → {result}")

    return result


# ============================================================
# メインAPI（analyzer.py から呼ばれる）
# ============================================================
def classify_register(y: np.ndarray, sr: int, f0: float, median_freq: float = 0,
                      already_separated: bool = False,
                      crepe_conf: float = 1.0) -> str:
    """
    地声 / ミックス / 裏声 を判定する。

    1. f0 <= 0 または len(y) < 512 → unknown
    2. crepe_conf < CREPE_NOISE_GATE → unknown（ノイズゲート）
    3. f0 < FALSETTO_HARD_MIN_HZ → 地声確定
    4. MLモデルがあり信頼度が閾値以上 → MLの結果（chest / falsetto）
    5. 上記以外 → ルールベース（ルート準拠: chest / mix / falsetto）
    """
    global _ML_STATUS_LOGGED

    if not _ML_STATUS_LOGGED:
        _load_model_if_needed()
        if _ML_MODEL is not None and extract_features is not None:
            print(f"[INFO] 🎯 MLモデル使用中 (from {_MODEL_PATH})")
        else:
            if not os.path.exists(_MODEL_PATH):
                print(f"[INFO] MLモデル: ファイルなし ({_MODEL_PATH})")
            else:
                print(f"[INFO] MLモデル: ロード失敗または特徴抽出器なし")
            print(f"[INFO] ルールベース判定（ルート準拠: chest/mix/falsetto）を使用します")
        _ML_STATUS_LOGGED = True

    if f0 <= 0 or len(y) < 512:
        return "unknown"

    if crepe_conf < CREPE_NOISE_GATE:
        return "unknown"

    if f0 < FALSETTO_HARD_MIN_HZ:
        return "chest"

    # ML を優先して試行
    ml_result = _classify_ml(y, sr, f0, crepe_conf=crepe_conf)
    if ml_result is not None:
        _log_counter += 1
        return ml_result

    # フォールバック: ルート準拠のルールベース（3クラス）
    _log_counter += 1
    return _classify_rules(y, sr, f0, median_freq, crepe_conf=crepe_conf)


# ============================================================
# ログ制御とサマリー
# ============================================================
def reset_register_stats():
    """統計情報をリセット（分析開始時に呼ぶ）"""
    global _log_counter, _stats
    _log_counter = 0
    _stats = {"ml_success": 0, "ml_fallback": 0, "rule_only": 0, "chest": 0, "mix": 0, "falsetto": 0}


def print_register_summary():
    """レジスター判定のサマリーを出力"""
    if REGISTER_LOG_LEVEL == 0:
        return

    total = _stats["chest"] + _stats["mix"] + _stats["falsetto"]
    if total == 0:
        return

    print(f"\n[REGISTER SUMMARY] 合計判定数: {total}フレーム")
    print(f"  ├─ 地声: {_stats['chest']}フレーム ({_stats['chest']/total*100:.1f}%)")
    print(f"  ├─ ミックス: {_stats['mix']}フレーム ({_stats['mix']/total*100:.1f}%)")
    print(f"  └─ 裏声: {_stats['falsetto']}フレーム ({_stats['falsetto']/total*100:.1f}%)")

    if _ML_MODEL is not None:
        print(f"  判定方式:")
        print(f"    ├─ ML判定成功: {_stats['ml_success']}フレーム")
        print(f"    ├─ ML→ルール: {_stats['ml_fallback']}フレーム")
        print(f"    └─ ルールのみ: {_stats['rule_only']}フレーム")
