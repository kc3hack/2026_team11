import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import time

from audio_converter import convert_to_wav, convert_to_wav_hq  # ← hq版を追加
from analyzer import analyze
from vocal_separator import separate_vocals
from database import get_all_songs, search_songs

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/songs")
def read_songs(limit: int = 20, offset: int = 0, q: str | None = None):
    if q:
        return search_songs(q, limit, offset)
    return get_all_songs(limit, offset)

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

        # Demucs出力フォルダ全体を削除対象にする
        # vocal_path例: separated/htdemucs/{uuid}/vocals.wav
        # → 削除対象: separated/htdemucs/{uuid} フォルダ全体
        if vocal_path:
            demucs_folder = os.path.dirname(vocal_path)  # {uuid}フォルダ

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
        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)
        time_str = f"{minutes}分{seconds}秒" if minutes > 0 else f"{seconds}秒"
        print(f"[API] ❌ Process failed: {e} (経過時間: {time_str})")
        # エラー時もDemucs出力フォルダを削除
        if vocal_path:
            demucs_folder = os.path.dirname(vocal_path)
        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path, demucs_folder)
        return {"error": f"処理中にエラーが発生しました: {str(e)}"}
