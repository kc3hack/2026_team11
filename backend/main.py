from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
from analyzer import VoiceAnalyzer
from database import search_songs, get_song, get_artists, get_artist_songs

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = VoiceAnalyzer()


@app.post("/analyze")
async def analyze_voice(file: UploadFile = File(...)):
    """録音データを受け取って音域を解析する"""
    
    # 一時ファイルに保存
    suffix = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = analyzer.analyze(tmp_path)
        return result
    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok"}


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
        "source": "voice-key.news",
    }


@app.get("/songs/search")
def song_search(q: str = Query(..., min_length=1)):
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
    songs = get_artist_songs(artist_id)
    if not songs:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません")
    return {"songs": [_format_song(s) for s in songs]}