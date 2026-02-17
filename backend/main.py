import warnings
warnings.filterwarnings("ignore", category=UserWarning)

import logging
import os
import uuid

from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from analyzer import analyze
from vocal_separator import separate_vocals
from database import search_songs, get_song, get_artists, get_artist, get_artist_songs
import shutil

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm"}


def _save_upload(file: UploadFile) -> str:
    """アップロードファイルを安全に保存し、パスを返す"""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"非対応のファイル形式です: {ext}")
    safe_name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", safe_name)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return file_path

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
    file_path = _save_upload(file)
    try:
        result = analyze(file_path)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
    return result


@app.post("/analyze-karaoke")
async def analyze_karaoke(file: UploadFile = File(...)):
    """カラオケ音源・BGM付きをボーカル分離して解析"""
    file_path = _save_upload(file)
    try:
        vocal_path = separate_vocals(file_path, progress_callback=lambda p: None)
        result = analyze(vocal_path, already_separated=True)
    except Exception as e:
        logging.exception("カラオケ解析に失敗")
        result = {"error": "解析に失敗しました"}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        shutil.rmtree("separated", ignore_errors=True)
    return result


# --- 楽曲音域データ API ---

def _format_song(row: dict) -> dict:
    """DB行をAPIレスポンス形式に変換"""
    return {
        "id": row["id"],
        "title": row["title"],
        "artist": row["artist"],
        "range": {
            "lowest": row["lowest_note"],
            "highest": row["highest_note"],
            "falsetto": row["falsetto_note"],
        },
        "note": row["note"],
        "source": row.get("source", "voice-key.news"),
    }


@app.get("/songs/search")
def song_search(q: str = Query(..., min_length=1, max_length=100)):
    """曲名またはアーティスト名で楽曲を検索する"""
    results = search_songs(q)
    return {"results": [_format_song(r) for r in results]}


@app.get("/songs/{song_id}")
def song_detail(song_id: int):
    """楽曲の音域データを取得する"""
    song = get_song(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="楽曲が見つかりません")
    return _format_song(song)


@app.get("/artists")
def artist_list(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    """アーティスト一覧を取得する"""
    return {"artists": get_artists(limit, offset)}


@app.get("/artists/{artist_id}/songs")
def artist_songs(artist_id: int):
    """アーティストの全楽曲を取得する"""
    artist = get_artist(artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません")
    songs = get_artist_songs(artist_id)
    return {"songs": [_format_song(s) for s in songs]}
