import warnings
warnings.filterwarnings("ignore", category=UserWarning)

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from analyzer import analyze
from vocal_separator import separate_vocals
import shutil
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_voice(file: UploadFile = File(...)):
    """マイク録音（アカペラ）を解析"""
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = analyze(file_path)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    return result


@app.post("/analyze-karaoke")
async def analyze_karaoke(file: UploadFile = File(...)):
    """カラオケ音源・BGM付きをボーカル分離して解析"""
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        vocal_path = separate_vocals(file_path, progress_callback=lambda p: None)
        result = analyze(vocal_path, already_separated=True)
    except Exception as e:
        import traceback
        traceback.print_exc()
        result = {"error": f"解析に失敗しました: {str(e)}"}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        shutil.rmtree("separated", ignore_errors=True)

    return result