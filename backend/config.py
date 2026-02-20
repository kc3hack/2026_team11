"""
config.py — 音域解析システムの共通定数

analyzer.py と register_classifier.py で使用する閾値・パラメータを集約。
チューニング時はこのファイルのみ変更すればよい。
"""

# === 音高検出 ===
VOICE_MIN_HZ = 65.0       # 人声の絶対下限 (C2付近)
VOICE_MAX_HZ = 1324.0     # 人声の絶対上限 (E6付近)
CREPE_SR = 16000           # CREPEのサンプリングレート
CREPE_HOP_LENGTH = 160     # 10ms (高速化: フレーム数半減)

# === フィルタリング ===
UNREALISTIC_LOWER_OCT = 1.5    # 下限: medianから1.5オクターブ下
UNREALISTIC_UPPER_OCT = 1.75   # 上限: medianから1.75オクターブ上
FALSETTO_DISPLAY_MIN_HZ = 330.0  # mid2E: 裏声の生理的下限 (表示フィルタ)

# === 信頼度フィルタリング ===
CONF_THRESHOLDS = [0.5, 0.35, 0.2, 0.1, 0.05, 0.01]  # 有効フレーム検出の閾値候補
CONF_MIN_FRAMES = 5  # 有効フレームの最小数

# === 外れ値除去 ===
CHEST_OUTLIER_PERCENTILE = 97
CHEST_OUTLIER_GAP_ST = 3       # 半音
FALSETTO_OUTLIER_PERCENTILE = 75
FALSETTO_OUTLIER_GAP_ST = 3
NO_FALSETTO_OUTLIER_PERCENTILE = 95
NO_FALSETTO_OUTLIER_GAP_ST = 3

# === 最高音混在解消 ===
CLEANUP_SEMITONES = 2  # 2半音分の幅で地声/裏声の混在を解消

# === 段階的信頼度要求 ===
GRADUATED_CONF_FAR = 0.65    # medianから1.5oct以上
GRADUATED_CONF_MID = 0.50    # medianから1.0oct以上
GRADUATED_CONF_NEAR = 0.35   # その他

# === レジスター判定 (register_classifier.py) ===
FALSETTO_HARD_MIN_HZ = 270.0       # これ以下は地声確定
ML_CONF_THRESHOLD_LOW_F0 = 0.75    # f0 < 500Hz (遷移帯域)
ML_CONF_THRESHOLD_HIGH = 0.70      # f0 >= 500Hz
ML_CONF_THRESHOLD_NOISY = 0.80     # CREPE信頼度低 + 高f0
ML_CONF_CHEST_HIGH_F0 = 0.85       # 地声 + f0 >= 400Hz
CREPE_NOISE_GATE = 0.35            # ピッチ推定ノイズゲート

# === ルールベース判定 ===
FALSETTO_RATIO_HIGH = 0.42    # f0 > 500Hz
FALSETTO_RATIO_MID = 0.48     # f0 > 400Hz
FALSETTO_RATIO_DEFAULT = 0.58 # その他
