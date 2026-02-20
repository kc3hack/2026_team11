import sqlite3
import pykakasi
import re

DB_PATH = "songs.db"

def main():
    # Kakasiのセットアップ（漢字→ひらがな変換）
    kks = pykakasi.kakasi()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. readingカラムがない場合は追加
    try:
        cursor.execute("ALTER TABLE artists ADD COLUMN reading TEXT")
    except sqlite3.OperationalError:
        pass # 既にある場合は無視

    # 2. まだ読み仮名がない、または空のアーティストを取得
    # （全部やり直したい場合は WHERE句を外してください）
    cursor.execute("SELECT id, name FROM artists WHERE reading IS NULL OR reading = ''")
    artists = cursor.fetchall()

    print(f"🔄 {len(artists)} 件のアーティストの読み仮名を生成します...")

    updates = []
    for artist_id, name in artists:
        # 変換実行
        result = kks.convert(name)
        # 結果をつなげてひらがなにする
        reading = "".join([item['hira'] for item in result])
        
        # 不要な文字（記号など）のクリーニング
        # 平仮名、片仮名、英数字以外を削除しておくとソートが綺麗になります
        # ここでは単純に小文字化のみ行います
        reading = reading.lower().strip()
        
        updates.append((reading, artist_id))

    # 3. DB更新
    if updates:
        cursor.executemany("UPDATE artists SET reading = ? WHERE id = ?", updates)
        conn.commit()
        print(f"✅ {len(updates)} 件更新完了！")
    else:
        print("ℹ️ 更新対象はありませんでした。")

    conn.close()

if __name__ == "__main__":
    main()