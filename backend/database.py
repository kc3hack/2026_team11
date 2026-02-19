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
    
    # テーブル作成
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL UNIQUE,
            song_count INTEGER DEFAULT 0,
            reading TEXT  -- 読み仮名カラム
        );

        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist_id INTEGER NOT NULL,
            lowest_note TEXT,
            highest_note TEXT,
            falsetto_note TEXT,
            note TEXT,
            source TEXT DEFAULT 'voice-key.news',
            FOREIGN KEY (artist_id) REFERENCES artists(id)
        );

        CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
        CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist_id);
        CREATE INDEX IF NOT EXISTS idx_artists_reading ON artists(reading); -- 読み仮名のインデックス
    """)

    # マイグレーション: 既存DBにカラムがない場合に追加する処理
    try:
        conn.execute("ALTER TABLE songs ADD COLUMN source TEXT DEFAULT 'voice-key.news'")
    except sqlite3.OperationalError:
        pass  # 既に存在する場合は無視
    
    try:
        conn.execute("ALTER TABLE artists ADD COLUMN reading TEXT")
    except sqlite3.OperationalError:
        pass

    conn.close()


def get_artist(artist_id: int) -> dict | None:
    """IDからアーティスト情報を取得"""
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM artists WHERE id = ?", (artist_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_song(song_id: int) -> dict | None:
    """IDから楽曲情報を取得"""
    conn = get_connection()
    try:
        # アーティスト名と読み仮名も結合して取得
        row = conn.execute("""
            SELECT s.*, a.name as artist, a.reading as artist_reading
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.id = ?
        """, (song_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_songs(limit: int = 20, offset: int = 0) -> list[dict]:
    """全曲を取得（読み仮名順でソート）"""
    conn = get_connection()
    try:
        # 【修正】readingを取得し、reading順（なければ名前順）でソート
        rows = conn.execute("""
            SELECT s.id, s.title, a.name as artist, a.reading as artist_reading,
                   s.lowest_note, s.highest_note, s.falsetto_note, s.note,
                   s.source
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            ORDER BY 
                CASE WHEN a.reading IS NULL OR a.reading = '' THEN 1 ELSE 0 END, -- 読みがないものを後ろへ
                a.reading, -- 読み仮名順
                a.name,    -- 名前順（読みが同じ場合）
                s.title    -- 曲名順
            LIMIT ? OFFSET ?
        """, (limit, offset)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def search_songs(query: str, limit: int = 20, offset: int = 0) -> list[dict]:
    """楽曲またはアーティスト名で検索（読み仮名対応）"""
    conn = get_connection()
    try:
        search_term = f"%{query}%"
        # 【修正】アーティストの読み仮名でも検索できるようにOR条件を追加
        rows = conn.execute("""
            SELECT s.id, s.title, a.name as artist, a.reading as artist_reading,
                   s.lowest_note, s.highest_note, s.falsetto_note, s.note,
                   s.source
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.title LIKE ? 
               OR a.name LIKE ?
               OR a.reading LIKE ?
            ORDER BY 
                CASE WHEN a.reading IS NULL OR a.reading = '' THEN 1 ELSE 0 END,
                a.reading, 
                a.name
            LIMIT ? OFFSET ?
        """, (search_term, search_term, search_term, limit, offset)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# ---------------------------------------------------------
# 以下、変更なしのヘルパー関数群
# ---------------------------------------------------------

def get_artists(limit: int = 100, offset: int = 0) -> list[dict]:
    """アーティスト一覧を取得"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT id, name, slug, song_count, reading
            FROM artists
            ORDER BY reading, name
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
            SELECT s.id, s.title, a.name as artist, a.reading as artist_reading,
                   s.lowest_note, s.highest_note, s.falsetto_note, s.note,
                   s.source
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE s.artist_id = ?
            ORDER BY s.title
        """, (artist_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()