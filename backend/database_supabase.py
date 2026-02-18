"""
Supabaseデータベースの接続管理とクエリ関数
"""
import os
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# 環境変数をロード
load_dotenv()

# Supabaseクライアントの初期化
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URLとSUPABASE_KEYを.envファイルに設定してください")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================================================
# 楽曲関連のクエリ関数
# ============================================================

def search_songs(query: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
    """曲名またはアーティスト名であいまい検索"""
    response = supabase.table("songs").select(
        "id, title, lowest_note, highest_note, falsetto_note, note, source, artists(name)"
    ).or_(f"title.ilike.%{query}%,artists.name.ilike.%{query}%").range(
        offset, offset + limit - 1
    ).execute()
    
    # artistsをフラットに変換
    songs = []
    for song in response.data:
        songs.append({
            **song,
            "artist": song["artists"]["name"] if song.get("artists") else None
        })
    return songs


def get_song(song_id: int) -> Optional[Dict[str, Any]]:
    """IDで楽曲を取得"""
    response = supabase.table("songs").select(
        "id, title, lowest_note, highest_note, falsetto_note, note, source, artists(name)"
    ).eq("id", song_id).single().execute()
    
    if response.data:
        return {
            **response.data,
            "artist": response.data["artists"]["name"] if response.data.get("artists") else None
        }
    return None


def get_all_songs(limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
    """全曲を取得（ページネーション対応）"""
    response = supabase.table("songs").select(
        "id, title, lowest_note, highest_note, falsetto_note, note, source, artists(name)"
    ).range(offset, offset + limit - 1).execute()
    
    songs = []
    for song in response.data:
        songs.append({
            **song,
            "artist": song["artists"]["name"] if song.get("artists") else None
        })
    return songs


def get_artist(artist_id: int) -> Optional[Dict[str, Any]]:
    """IDでアーティストを取得"""
    response = supabase.table("artists").select(
        "id, name, slug, song_count"
    ).eq("id", artist_id).single().execute()
    return response.data


def get_artists(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """アーティスト一覧を取得"""
    response = supabase.table("artists").select(
        "id, name, slug, song_count"
    ).order("name").range(offset, offset + limit - 1).execute()
    return response.data


def get_artist_songs(artist_id: int) -> List[Dict[str, Any]]:
    """アーティストの全曲を取得"""
    response = supabase.table("songs").select(
        "id, title, lowest_note, highest_note, falsetto_note, note, source, artists(name)"
    ).eq("artist_id", artist_id).order("title").execute()
    
    songs = []
    for song in response.data:
        songs.append({
            **song,
            "artist": song["artists"]["name"] if song.get("artists") else None
        })
    return songs


# ============================================================
# ユーザープロファイル関連
# ============================================================

def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """ユーザープロファイルを取得"""
    response = supabase.table("user_profiles").select("*").eq("id", user_id).single().execute()
    return response.data


def update_user_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """ユーザープロファイルを更新"""
    response = supabase.table("user_profiles").update(data).eq("id", user_id).execute()
    return response.data[0] if response.data else None


def update_vocal_range(
    user_id: str,
    vocal_min: Optional[str] = None,
    vocal_max: Optional[str] = None,
    falsetto: Optional[str] = None
) -> Dict[str, Any]:
    """ユーザーの最新声域を更新"""
    data = {}
    if vocal_min:
        data["current_vocal_range_min"] = vocal_min
    if vocal_max:
        data["current_vocal_range_max"] = vocal_max
    if falsetto:
        data["current_falsetto_max"] = falsetto
    
    return update_user_profile(user_id, data)


# ============================================================
# 分析履歴関連
# ============================================================

def create_analysis_record(
    user_id: str,
    vocal_min: Optional[str],
    vocal_max: Optional[str],
    falsetto: Optional[str],
    source_type: str,
    file_name: Optional[str] = None
) -> Dict[str, Any]:
    """分析履歴を新規作成"""
    data = {
        "user_id": user_id,
        "vocal_range_min": vocal_min,
        "vocal_range_max": vocal_max,
        "falsetto_max": falsetto,
        "source_type": source_type,
        "file_name": file_name
    }
    response = supabase.table("analysis_history").insert(data).execute()
    return response.data[0] if response.data else None


def get_analysis_history(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """ユーザーの分析履歴を取得（新しい順）"""
    response = supabase.table("analysis_history").select(
        "*"
    ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
    return response.data


# ============================================================
# お気に入り楽曲関連
# ============================================================

def add_favorite_song(user_id: str, song_id: int) -> Optional[Dict[str, Any]]:
    """お気に入りに楽曲を追加"""
    try:
        data = {"user_id": user_id, "song_id": song_id}
        response = supabase.table("favorite_songs").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        # 既に登録済みの場合はエラーになる
        print(f"お気に入り追加エラー: {e}")
        return None


def remove_favorite_song(user_id: str, song_id: int) -> bool:
    """お気に入りから楽曲を削除"""
    try:
        supabase.table("favorite_songs").delete().eq("user_id", user_id).eq("song_id", song_id).execute()
        return True
    except Exception:
        return False


def get_favorite_songs(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """ユーザーのお気に入り楽曲一覧を取得"""
    response = supabase.table("favorite_songs").select(
        "*, songs(id, title, lowest_note, highest_note, falsetto_note, artists(name))"
    ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
    
    favorites = []
    for fav in response.data:
        song = fav.get("songs", {})
        favorites.append({
            "favorite_id": fav["id"],
            "created_at": fav["created_at"],
            "song_id": song.get("id"),
            "title": song.get("title"),
            "artist": song.get("artists", {}).get("name") if song.get("artists") else None,
            "lowest_note": song.get("lowest_note"),
            "highest_note": song.get("highest_note"),
            "falsetto_note": song.get("falsetto_note")
        })
    return favorites


def is_favorite(user_id: str, song_id: int) -> bool:
    """楽曲がお気に入りに登録されているか確認"""
    response = supabase.table("favorite_songs").select("id").eq(
        "user_id", user_id
    ).eq("song_id", song_id).execute()
    return len(response.data) > 0
