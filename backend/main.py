import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import time

from audio_converter import convert_to_wav, convert_to_wav_hq
from analyzer import analyze
from vocal_separator import separate_vocals
from database import get_all_songs, search_songs
from recommender import recommend_songs, find_similar_artists, classify_voice_type, recommend_key_for_song

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/songs")
def read_songs(
    limit: int = 20, offset: int = 0, q: str | None = None,
    chest_min_hz: float | None = Query(None, description="ユーザー地声最低(Hz)"),
    chest_max_hz: float | None = Query(None, description="ユーザー地声最高(Hz)"),
    falsetto_max_hz: float | None = Query(None, description="ユーザー裏声最高(Hz)"),
):
    if q:
        songs = search_songs(q, limit, offset)
    else:
        songs = get_all_songs(limit, offset)

    # ユーザーの音域が指定されている場合、各曲にキー変更おすすめを追加
    if chest_min_hz and chest_max_hz:
        effective_max = chest_max_hz
        if falsetto_max_hz and falsetto_max_hz > chest_max_hz:
            effective_max = falsetto_max_hz
        for song in songs:
            try:
                key_info = recommend_key_for_song(
                    song.get("lowest_note"),
                    song.get("highest_note"),
                    chest_min_hz,
                    effective_max,
                )
                song.update(key_info)
            except Exception:
                song["recommended_key"] = 0
                song["fit"] = "unknown"

    return songs


# ============================================================
# おすすめ曲・似てるアーティスト（単体エンドポイント）
# フロントから解析済みHz値を渡して使う
# ============================================================
@app.get("/recommend")
def get_recommendations(
    chest_min_hz: float = Query(...),
    chest_max_hz: float = Query(...),
    chest_avg_hz: float = Query(...),
    falsetto_max_hz: float | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
):
    """音域Hzを指定しておすすめ曲を取得"""
    return recommend_songs(chest_min_hz, chest_max_hz, chest_avg_hz, falsetto_max_hz, limit)


@app.get("/similar-artists")
def get_similar_artists(
    chest_min_hz: float = Query(...),
    chest_max_hz: float = Query(...),
    chest_avg_hz: float = Query(...),
    limit: int = Query(5, ge=1, le=20),
):
    """音域Hzを指定して似てるアーティストを取得"""
    return find_similar_artists(chest_min_hz, chest_max_hz, chest_avg_hz, limit)


# ============================================================
# ファイル管理
# ============================================================
UPLOAD_DIR = "uploads"
SEPARATED_DIR = "separated"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SEPARATED_DIR, exist_ok=True)

def cleanup_files(*paths):
    """一時ファイルを削除するタスク"""
    for path in paths:
        if not path: continue
        try:
            if os.path.isfile(path):
                os.remove(path)
            elif os.path.isdir(path):
                shutil.rmtree(path)
        except Exception as e:
            print(f"[WARN] Cleanup failed for {path}: {e}")


def _enrich_result(result: dict) -> dict:
    """解析結果におすすめ曲・似てるアーティストを追加"""
    if "error" in result:
        return result

    chest_min_hz = result.get("chest_min_hz", 0)
    chest_max_hz = result.get("chest_max_hz", 0)
    chest_avg_hz = result.get("chest_avg_hz", 0)
    falsetto_max_hz = result.get("falsetto_max_hz")

    # デフォルト値を設定（フロントエンドでキー不在エラーを防止）
    result.setdefault("recommended_songs", [])
    result.setdefault("similar_artists", [])
    result.setdefault("voice_type", {})

    if chest_min_hz > 0 and chest_max_hz > 0:
        try:
            result["recommended_songs"] = recommend_songs(
                chest_min_hz, chest_max_hz, chest_avg_hz, falsetto_max_hz, limit=10
            )
        except Exception as e:
            print(f"[WARN] おすすめ曲取得失敗: {e}")

        try:
            result["similar_artists"] = find_similar_artists(
                chest_min_hz, chest_max_hz, chest_avg_hz, limit=5
            )
        except Exception as e:
            print(f"[WARN] 似てるアーティスト取得失敗: {e}")

        try:
            result["voice_type"] = classify_voice_type(
                chest_min_hz, chest_max_hz, chest_avg_hz,
                falsetto_max_hz,
                result.get("chest_ratio", 100.0),
            )
        except Exception as e:
            print(f"[WARN] 声質タイプ判定失敗: {e}")

    return result


# ============================================================
# 解析エンドポイント
# ============================================================
@app.post("/analyze")
async def analyze_voice(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """アカペラ/マイク録音用 (Demucsなし)"""
    start_time = time.time()
    print(f"\n{'#'*60}")
    print(f"[API] 📥 アカペラ音源分析リクエスト受信: {file.filename}")
    print(f"{'#'*60}")
    
    temp_input_path = None
    converted_wav_path = None
    
    try:
        print(f"[API] [1/3] ファイル保存中...")
        ext = os.path.splitext(file.filename)[1] or ".tmp"
        temp_input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
        
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"[API] ✅ 保存完了: {temp_input_path}")

        print(f"\n[API] [2/3] WAV変換中...")
        # マイク録音は16kHz/モノラルで十分
        converted_wav_path = convert_to_wav(temp_input_path, output_dir=UPLOAD_DIR)
        print(f"[API] ✅ 変換完了: {converted_wav_path}")

        print(f"\n[API] [3/3] 音域解析実行中...")
        result = analyze(converted_wav_path)
        result = _enrich_result(result)

        elapsed_time = time.time() - start_time
        print(f"\n[API] ✅ アカペラ音源分析完了! (処理時間: {elapsed_time:.2f}秒)")
        print(f"{'#'*60}\n")

        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path)
        return result

    except Exception as e:
        elapsed_time = time.time() - start_time
        print(f"[API] ❌ エラー発生: {e} (経過時間: {elapsed_time:.2f}秒)")
        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path)
        return {"error": f"エラーが発生しました: {str(e)}"}

@app.post("/analyze-karaoke")
async def analyze_karaoke(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """カラオケ音源用 (Demucsあり)"""
    start_time = time.time()
    print(f"\n{'#'*60}")
    print(f"[API] 📥 カラオケ音源分析リクエスト受信: {file.filename}")
    print(f"{'#'*60}")
    
    temp_input_path = None
    converted_wav_path = None
    vocal_path = None
    demucs_folder = None
    
    try:
        print(f"[API] [1/4] ファイル保存中...")
        ext = os.path.splitext(file.filename)[1] or ".tmp"
        temp_input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"[API] ✅ 保存完了: {temp_input_path}")

        print(f"\n[API] [2/4] 高品質WAV変換中...")
        # ★修正: Demucs前は高品質変換(44100Hz/ステレオ)が必須
        # 16kHz/モノラルだとDemucsのボーカル分離精度が大幅に落ちる
        converted_wav_path = convert_to_wav_hq(temp_input_path, output_dir=UPLOAD_DIR)
        print(f"[API] ✅ 変換完了: {converted_wav_path}")

        print(f"\n[API] [3/4] Demucsボーカル分離実行中...")
        # Demucsでボーカル分離 (ultra_fast_mode=True で超高速化)
        vocal_path = separate_vocals(converted_wav_path, output_dir=SEPARATED_DIR, ultra_fast_mode=True)
        print(f"[API] ✅ ボーカル分離完了: {vocal_path}")
        
        print(f"\n[API] [4/4] 音域解析実行中...")
        # 解析 (Demucs出力のvocals.wavはそのまま渡す)
        result = analyze(vocal_path, already_separated=True)
        result = _enrich_result(result)

        # Demucs出力フォルダ全体を削除対象にする
        if vocal_path:
            demucs_folder = os.path.dirname(vocal_path)

        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)
        time_str = f"{minutes}分{seconds}秒" if minutes > 0 else f"{seconds}秒"
        print(f"\n[API] ✅ カラオケ音源分析完了! (処理時間: {time_str})")
        if elapsed_time > 240:  # 4分以上
            print(f"[WARN] ⚠️ 処理時間が長いです ({time_str})")
        print(f"{'#'*60}\n")
        
        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path, demucs_folder)
        
        return result

    except Exception as e:
        print(f"[ERROR] Process failed: {e}")
        if vocal_path:
            demucs_folder = os.path.dirname(vocal_path)
        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path, demucs_folder)
        return {"error": f"処理中にエラーが発生しました: {str(e)}"}