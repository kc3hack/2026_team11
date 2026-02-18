"""
recommender.py — 歌唱力分析・おすすめ曲・似てるアーティスト

analyzeの結果とsongs.dbを照合して:
  1. 歌唱力分析スコア（音域・安定性・表現力）
  2. 音域に合ったおすすめ曲（地声平均も考慮）
  3. 声質が似てるアーティスト
を返す。
"""

import math
import numpy as np
from note_converter import NOTE_TABLE, hz_to_label_and_hz
from database import get_connection

# ============================================================
# カラオケ表記 ↔ Hz 変換
# ============================================================
_LABEL_TO_HZ = {label: hz for _, label, hz in NOTE_TABLE}

# ★ voice-key.news は mid1A/mid1A#/mid1B を使うが、
#    NOTE_TABLE は A3→mid2A にマッピングしている（A始まり区切り）。
#    DB内の692曲がサイレントに除外されるバグを修正。
#    同様に lowA/lowA#/lowB と lo* の表記揺れも対応。
_NOTE_ALIASES = {
    # mid1 A/A#/B → mid2 A/A#/B と同じ周波数
    "mid1A":   _LABEL_TO_HZ["mid2A"],     # 221.0
    "mid1A#":  _LABEL_TO_HZ["mid2A#"],    # 234.141
    "mid1B":   _LABEL_TO_HZ["mid2B"],     # 248.064
    # loX → lowX の表記揺れ
    "loC":     _LABEL_TO_HZ.get("lowC",  65.704),
    "loC#":    _LABEL_TO_HZ.get("lowC#", 69.611),
    "loD":     _LABEL_TO_HZ.get("lowD",  73.75),
    "loD#":    _LABEL_TO_HZ.get("lowD#", 78.135),
    "loE":     _LABEL_TO_HZ.get("lowE",  82.781),
    "loF":     _LABEL_TO_HZ.get("lowF",  87.704),
    "loF#":    _LABEL_TO_HZ.get("lowF#", 92.919),
    "loG":     _LABEL_TO_HZ.get("lowG",  98.444),
    "loG#":    _LABEL_TO_HZ.get("lowG#", 104.298),
    "loA":     _LABEL_TO_HZ.get("lowA",  110.5),
    "loA#":    _LABEL_TO_HZ.get("lowA#", 117.071),
    "loB":     _LABEL_TO_HZ.get("lowB",  124.032),
}
_LABEL_TO_HZ.update(_NOTE_ALIASES)


def label_to_hz(label: str) -> float | None:
    """カラオケ表記(mid2C等) → Hz。見つからなければNone"""
    if not label:
        return None
    return _LABEL_TO_HZ.get(label)


def _semitones(hz1: float, hz2: float) -> float:
    """2周波数間の半音数（hz2 > hz1 で正）"""
    if hz1 <= 0 or hz2 <= 0:
        return 0.0
    return 12.0 * math.log2(hz2 / hz1)


# ============================================================
# 1. 歌唱力分析
# ============================================================
def analyze_singing_ability(
    f0_array: np.ndarray,
    conf_array: np.ndarray,
    chest_notes: list[float],
    falsetto_notes: list[float],
    overall_min_hz: float,
    overall_max_hz: float,
) -> dict:
    """
    CREPE解析データから歌唱力指標を算出

    Returns:
        {
            "range_semitones": 音域の広さ(半音),
            "range_score":     音域スコア(0-100),
            "stability_score": 安定性スコア(0-100),
            "expression_score":表現力スコア(0-100),
            "overall_score":   総合スコア(0-100),
        }
    """
    result = {}

    # --- 音域の広さ ---
    # 一般: 1-1.5oct(12-18st), 上手い: 2oct(24st), プロ級: 2.5+oct(30+st)
    range_st = _semitones(overall_min_hz, overall_max_hz)
    range_score = min(100.0, (range_st / 30.0) * 100.0)
    result["range_semitones"] = round(range_st, 1)
    result["range_score"] = round(range_score, 1)

    # --- ピッチ安定性 ---
    # ローカル区間(25ms=5フレーム)のピッチ標準偏差(cent)の平均で評価
    # std=0: 完璧, std≥50: かなり不安定
    stability_score = _compute_stability(f0_array, conf_array)
    result["stability_score"] = round(stability_score, 1)

    # --- 表現力（声区の使い分け＋音域の活用度） ---
    expression_score = _compute_expression(
        chest_notes, falsetto_notes, overall_min_hz, overall_max_hz
    )
    result["expression_score"] = round(expression_score, 1)

    # --- 総合スコア ---
    overall = range_score * 0.30 + stability_score * 0.45 + expression_score * 0.25
    result["overall_score"] = round(overall, 1)

    return result


def _compute_stability(f0: np.ndarray, conf: np.ndarray) -> float:
    """ピッチ安定性スコア (0-100)"""
    if len(f0) < 10:
        return 50.0

    # confidence >= 0.3 のフレームのみ使用
    mask = (conf >= 0.3) & (f0 > 0)
    f0_valid = f0[mask]
    if len(f0_valid) < 10:
        return 50.0

    window = 5
    local_stds = []
    for i in range(0, len(f0_valid) - window, window):
        seg = f0_valid[i : i + window]
        med = np.median(seg)
        if med > 0:
            cents = 1200.0 * np.log2(seg / med + 1e-10)
            local_stds.append(float(np.std(cents)))

    if not local_stds:
        return 50.0

    avg_std = float(np.mean(local_stds))
    # std=0→100, std=50→0
    return max(0.0, min(100.0, 100.0 - avg_std * 2.0))


def _compute_expression(
    chest_notes: list[float],
    falsetto_notes: list[float],
    overall_min_hz: float,
    overall_max_hz: float,
) -> float:
    """表現力スコア (0-100)"""
    total = len(chest_notes) + len(falsetto_notes)
    if total == 0:
        return 0.0

    score = 30.0  # ベース

    # 声区の多様性: 両方使えていれば加点
    if len(falsetto_notes) > 0 and len(chest_notes) > 0:
        minor = min(len(falsetto_notes), len(chest_notes))
        diversity = minor / total  # 0〜0.5
        score += diversity * 80.0  # max +40

    # 音域の活用度: 使っている音域のバリエーション
    all_notes = chest_notes + falsetto_notes
    if len(all_notes) >= 5:
        arr = np.array(all_notes)
        iqr_st = _semitones(float(np.percentile(arr, 25)), float(np.percentile(arr, 75)))
        # IQR が広いほど多くの音域を使っている
        score += min(30.0, iqr_st * 3.0)

    return min(100.0, score)


# ============================================================
# 2. おすすめ曲
# ============================================================
def recommend_songs(
    chest_min_hz: float,
    chest_max_hz: float,
    chest_avg_hz: float,
    falsetto_max_hz: float | None = None,
    limit: int = 10,
) -> list[dict]:
    """
    ユーザーの音域に合った楽曲をスコア順で返す。

    スコアリング:
      - 楽曲の音域がユーザーの地声範囲に収まるほど高スコア
      - 楽曲の中心音がユーザーの平均に近いほど高スコア
      - 裏声がある場合、裏声最高音も上限として考慮
      - 完全に範囲内ならボーナス加点
    """
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT s.id, s.title, a.name as artist,
                   s.lowest_note, s.highest_note, s.falsetto_note, s.source
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.lowest_note IS NOT NULL AND s.highest_note IS NOT NULL
        """).fetchall()

        # 裏声があればそこまで上限を広げる
        effective_max = chest_max_hz
        if falsetto_max_hz and falsetto_max_hz > chest_max_hz:
            effective_max = falsetto_max_hz

        candidates = []
        for row in rows:
            r = dict(row)
            lo_hz = label_to_hz(r["lowest_note"])
            hi_hz = label_to_hz(r["highest_note"])
            if not lo_hz or not hi_hz or lo_hz > hi_hz:
                continue

            # ペナルティ（半音単位）
            low_penalty = 0.0
            high_penalty = 0.0

            if lo_hz < chest_min_hz:
                low_penalty = _semitones(lo_hz, chest_min_hz)
            if hi_hz > effective_max:
                high_penalty = _semitones(effective_max, hi_hz)

            # 中心音のずれ
            song_center = math.sqrt(lo_hz * hi_hz)
            center_diff = abs(_semitones(chest_avg_hz, song_center)) if chest_avg_hz > 0 else 0.0

            # スコア計算
            score = 100.0
            score -= low_penalty * 6.0       # 低音はみ出し
            score -= high_penalty * 8.0      # 高音はみ出し（厳しめ）
            score -= center_diff * 2.0       # 中心ずれ

            # 完全に範囲内ボーナス
            if low_penalty == 0 and high_penalty == 0:
                score += 5.0

            if score > 30:
                candidates.append({
                    "id": r["id"],
                    "title": r["title"],
                    "artist": r["artist"],
                    "lowest_note": r["lowest_note"],
                    "highest_note": r["highest_note"],
                    "match_score": round(min(100.0, score), 1),
                })

        candidates.sort(key=lambda x: x["match_score"], reverse=True)

        # アーティスト多様性: 同一アーティストは最大2曲まで
        result_list = []
        artist_count: dict[str, int] = {}
        for c in candidates:
            name = c["artist"]
            if artist_count.get(name, 0) >= 2:
                continue
            artist_count[name] = artist_count.get(name, 0) + 1

            # 各曲にキー変更おすすめを追加
            key_info = recommend_key_for_song(
                c.get("lowest_note"), c.get("highest_note"),
                chest_min_hz, effective_max,
            )
            c.update(key_info)

            result_list.append(c)
            if len(result_list) >= limit:
                break

        return result_list
    finally:
        conn.close()


# ============================================================
# 3. 似てるアーティスト
# ============================================================
def find_similar_artists(
    chest_min_hz: float,
    chest_max_hz: float,
    chest_avg_hz: float,
    limit: int = 5,
) -> list[dict]:
    """
    ユーザーの音域に最も近いアーティストを返す。
    各アーティストの全楽曲の中央値(最低音/最高音)で比較。
    """
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT a.id, a.name, a.song_count,
                   s.lowest_note, s.highest_note
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.lowest_note IS NOT NULL AND s.highest_note IS NOT NULL
        """).fetchall()

        # アーティストごとに集約
        artists: dict[int, dict] = {}
        for row in rows:
            r = dict(row)
            aid = r["id"]
            lo_hz = label_to_hz(r["lowest_note"])
            hi_hz = label_to_hz(r["highest_note"])
            if not lo_hz or not hi_hz:
                continue
            if aid not in artists:
                artists[aid] = {
                    "id": aid,
                    "name": r["name"],
                    "song_count": r["song_count"],
                    "lows": [],
                    "highs": [],
                }
            artists[aid]["lows"].append(lo_hz)
            artists[aid]["highs"].append(hi_hz)

        results = []
        for data in artists.values():
            if len(data["lows"]) < 2:
                continue

            med_low = float(np.median(data["lows"]))
            med_high = float(np.median(data["highs"]))
            med_center = math.sqrt(med_low * med_high)

            low_diff = abs(_semitones(med_low, chest_min_hz))
            high_diff = abs(_semitones(med_high, chest_max_hz))
            center_diff = (
                abs(_semitones(med_center, chest_avg_hz)) if chest_avg_hz > 0 else 99.0
            )

            # 類似度: 差が小さいほど高い
            similarity = 100.0 - (low_diff * 3.0 + high_diff * 3.0 + center_diff * 4.0)

            if similarity > 20:
                lo_label, _ = hz_to_label_and_hz(med_low)
                hi_label, _ = hz_to_label_and_hz(med_high)
                results.append({
                    "id": data["id"],
                    "name": data["name"],
                    "song_count": data["song_count"],
                    "typical_lowest": lo_label,
                    "typical_highest": hi_label,
                    "similarity_score": round(min(100.0, similarity), 1),
                })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:limit]
    finally:
        conn.close()


# ============================================================
# 4. 声質タイプ判定
# ============================================================
def classify_voice_type(
    chest_min_hz: float,
    chest_max_hz: float,
    chest_avg_hz: float,
    falsetto_max_hz: float | None,
    chest_ratio: float,
) -> dict:
    """
    音域と声区比率から声質タイプを判定。

    Returns:
        {
            "voice_type":   "ハイトーン" etc,
            "description":  説明文,
            "range_class":  "テノール" etc,
        }
    """
    # 音域クラス（地声の中心音で判定）
    if chest_avg_hz >= 350:
        range_class = "ハイテノール"
    elif chest_avg_hz >= 280:
        range_class = "テノール"
    elif chest_avg_hz >= 220:
        range_class = "バリトン"
    elif chest_avg_hz >= 160:
        range_class = "バス・バリトン"
    else:
        range_class = "バス"

    # 声質タイプ（音域の広さ＋裏声使用率で総合判定）
    range_st = _semitones(chest_min_hz, chest_max_hz) if chest_min_hz > 0 and chest_max_hz > 0 else 0
    has_wide_range = range_st >= 15  # 15半音(1.25oct)以上 = 広い
    uses_falsetto = chest_ratio < 85  # 裏声15%以上使用
    high_voice = chest_max_hz >= 400  # mid2G#以上

    if high_voice and uses_falsetto:
        voice_type = "ハイトーン・ミックス"
        description = "高音域を裏声と地声を切り替えて歌うタイプ。J-POPの多くの楽曲に対応できます。"
    elif high_voice and not uses_falsetto:
        voice_type = "パワフル・ハイトーン"
        description = "地声で高音域まで出せるパワフルなタイプ。力強い歌唱が持ち味です。"
    elif has_wide_range and uses_falsetto:
        voice_type = "表現力豊かなミックス"
        description = "広い音域を地声と裏声で使い分ける表現力豊かなタイプ。バラードからアップテンポまで幅広く対応。"
    elif has_wide_range:
        voice_type = "ワイドレンジ"
        description = "広い音域を地声でカバーできるタイプ。安定感のある歌唱が特徴です。"
    elif uses_falsetto:
        voice_type = "ファルセット主体"
        description = "裏声を多用する繊細な歌唱タイプ。やわらかい声質が魅力です。"
    elif chest_max_hz >= 350:
        voice_type = "ミドル・ハイ"
        description = "中〜高音域が得意なバランスの取れたタイプ。多くのポップスに対応できます。"
    else:
        voice_type = "ロー・ミドル"
        description = "中〜低音域が安定したタイプ。落ち着いた楽曲や渋い曲が合います。"

    return {
        "voice_type": voice_type,
        "description": description,
        "range_class": range_class,
    }


# ============================================================
# 5. キー変更おすすめ
# ============================================================
def recommend_key_for_song(
    song_lowest_note: str | None,
    song_highest_note: str | None,
    user_min_hz: float,
    user_max_hz: float,
) -> dict:
    """
    楽曲に対してユーザーの音域に最適なキー変更を計算。

    Returns:
        {
            "recommended_key": int (-7〜+7, 0=原曲キー),
            "fit": "perfect" | "good" | "ok" | "hard",
        }
    """
    song_lo = label_to_hz(song_lowest_note) if song_lowest_note else None
    song_hi = label_to_hz(song_highest_note) if song_highest_note else None

    if not song_lo or not song_hi or user_min_hz <= 0 or user_max_hz <= 0:
        return {"recommended_key": 0, "fit": "unknown"}

    best_shift = 0
    best_score = -9999.0

    for shift in range(-7, 8):
        factor = 2.0 ** (shift / 12.0)
        lo = song_lo * factor
        hi = song_hi * factor

        # はみ出しペナルティ（半音単位）
        low_pen = _semitones(lo, user_min_hz) if lo < user_min_hz else 0.0
        high_pen = _semitones(user_max_hz, hi) if hi > user_max_hz else 0.0

        # キー変更量のペナルティ（原曲に近いほど良い）
        shift_pen = abs(shift) * 2.0

        score = 100.0 - low_pen * 6.0 - high_pen * 10.0 - shift_pen

        if score > best_score:
            best_score = score
            best_shift = shift

    if best_score >= 90:
        fit = "perfect"
    elif best_score >= 70:
        fit = "good"
    elif best_score >= 50:
        fit = "ok"
    else:
        fit = "hard"

    return {"recommended_key": best_shift, "fit": fit}