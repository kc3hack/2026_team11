"""
楽曲音域データベースの接続管理とクエリ関数
SQLite を使用（Python標準ライブラリ）
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "songs.db")


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: str = DB_PATH):
    """テーブルを作成する（既に存在する場合はスキップ）"""
    conn = get_connection(db_path)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL UNIQUE,
            song_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist_id INTEGER NOT NULL,
            lowest_note TEXT,
            highest_note TEXT,
            falsetto_note TEXT,
            note TEXT,
            FOREIGN KEY (artist_id) REFERENCES artists(id)
        );

        CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
        CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist_id);
    """)
    conn.commit()
    conn.close()


def search_songs(query: str, limit: int = 20) -> list[dict]:
    """曲名またはアーティスト名であいまい検索"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT s.id, s.title, a.name as artist,
                   s.lowest_note, s.highest_note, s.falsetto_note, s.note
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.title LIKE ? OR a.name LIKE ?
            LIMIT ?
        """, (f"%{query}%", f"%{query}%", limit)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_song(song_id: int) -> dict | None:
    """IDで楽曲を取得"""
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT s.id, s.title, a.name as artist,
                   s.lowest_note, s.highest_note, s.falsetto_note, s.note
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.id = ?
        """, (song_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_artists(limit: int = 100, offset: int = 0) -> list[dict]:
    """アーティスト一覧を取得"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT id, name, slug, song_count
            FROM artists
            ORDER BY name
            LIMIT ? OFFSET ?
        """, (limit, offset)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_artist_songs(artist_id: int) -> list[dict]:
    """アーティストの全曲を取得"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT s.id, s.title, a.name as artist,
                   s.lowest_note, s.highest_note, s.falsetto_note, s.note
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.artist_id = ?
            ORDER BY s.title
        """, (artist_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
