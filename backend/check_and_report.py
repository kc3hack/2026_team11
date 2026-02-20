import sqlite3
import unicodedata
import re

# ==========================================
# 1. 辞書データ（前回と同じもの＋α）
# ==========================================
ENGLISH_TO_KANA = {
    # 主要アイドル・グループ
    "AKB48": "えーけーびーふぉーてぃーえいと",
    "SKE48": "えすけーいーふぉーてぃーえいと",
    "NMB48": "えぬえむびーふぉーてぃーえいと",
    "HKT48": "えいちけーてぃーふぉーてぃーえいと",
    "NGT48": "えぬじーてぃーふぉーてぃーえいと",
    "STU48": "えすて´¼ーふぉーてぃーえいと",
    "JKT48": "じぇいけーてぃーふぉーてぃーえいと",
    "乃木坂46": "のぎざかふぉーてぃーしっくす",
    "櫻坂46": "さくらざかふぉーてぃーしっくす",
    "日向坂46": "ひなたざかふぉーてぃーしっくす",
    "欅坂46": "けやきざかふぉーてぃーしっくす",
    "BABYMETAL": "べびーめたる",
    "BiSH": "びっしゅ",
    "BiS": "びす",
    "Perfume": "ぱふゅーむ",
    "Momoclo": "ももいろくろーばーぜっと",
    "Momoiro Clover Z": "ももいろくろーばーぜっと",
    "Morning Musume": "もーにんぐむすめ",
    "Morning Musume.": "もーにんぐむすめ",
    "モーニング娘。": "もーにんぐむすめ",
    
    # アルファベット系
    "AAA": "とりぷるえー",
    "Da-iCE": "だいす",
    "DA PUMP": "だぱんぷ",
    "EXILE": "えぐざいる",
    "FANTASTICS from EXILE TRIBE": "ふぁんたすてぃっくす",
    "GENERATIONS from EXILE TRIBE": "じぇねれーしょんず",
    "THE RAMPAGE from EXILE TRIBE": "ざらんぺーじ",
    "JSB": "じぇいそうる",
    "Three Js": "さんだいめ",
    "Kis-My-Ft2": "きすまいふっとつー",
    "KinKi Kids": "きんききっず",
    "King & Prince": "きんぐあんどぷりんす",
    "SixTONES": "すとーんず",
    "Snow Man": "すのーまん",
    "Sexy Zone": "せくしーぞーん",
    "Hey! Say! JUMP": "へいせいじゃんぷ",
    "KAT-TUN": "かとぅーん",
    "NEWS": "にゅーす",
    "V6": "ぶいしっくす",
    "Arashi": "あらし",
    "SMAP": "すまっぷ",
    "TOKIO": "ときお",
    
    # バンド・アーティスト
    "B'z": "びーず",
    "Mr.Children": "みすたーちるどれん",
    "Mrs. GREEN APPLE": "みせすぐりーんあっぷる",
    "Official髭男dism": "おふぃしゃるひげだんでぃずむ",
    "ONE OK ROCK": "わんおくろっく",
    "RADWIMPS": "らっどうぃんぷす",
    "BUMP OF CHICKEN": "ばんぷおぶちきん",
    "UVERworld": "うーばーわーるど",
    "L'Arc~en~Ciel": "らるくあんしえる",
    "GLAY": "ぐれい",
    "X JAPAN": "えっくすじゃぱん",
    "LUNA SEA": "るなしー",
    "GReeeeN": "ぐりーん",
    "SEKAI NO OWARI": "せかいのおわり",
    "Back Number": "ばっくなんばー",
    "Hoshino Gen": "ほしのげん",
    "Yonezu Kenshi": "よねづけんし",
    "Vaundy": "ばうんでぃ",
    "Fujii Kaze": "ふじいかぜ",
    "YOASOBI": "よあそび",
    "Ado": "あど",
    "LiSA": "りさ",
    "Aimer": "えめ",
    "Uru": "うる",
    "milet": "みれい",
    "YUI": "ゆい",
    "miwa": "みわ",
    "aiko": "あいこ",
    "Ayaka": "あやか",
    "Superfly": "すーぱーふらい",
    "JUJU": "じゅじゅ",
    "MISIA": "みーしゃ",
    "AI": "あい",
    "YuNi": "ゆに",
    "KAF": "かふ",
    
    # 洋楽メジャー
    "The Beatles": "びーとるず",
    "Queen": "くいーん",
    "Michael Jackson": "まいけるじゃくそん",
    "Taylor Swift": "ていらーすうぃふと",
    "Ariana Grande": "ありあなぐらんで",
    "Justin Bieber": "じゃすてぃんびーばー",
    "Bruno Mars": "ぶるーのまーず",
    "Ed Sheeran": "えどしーらん",
    "BTS": "びーてぃーえす",
    "TWICE": "とぅわいす",
    "BLACKPINK": "ぶらっくぴんく",
}

DB_PATH = "songs.db"

def normalize_name(name):
    """
    名前を正規化する関数
    全角英数を半角に、スペース削除、小文字化
    例: "ＡＫＢ４８" -> "akb48"
    """
    # 全角 -> 半角変換 (NFKC正規化)
    normalized = unicodedata.normalize('NFKC', name)
    # スペース削除、小文字化
    return normalized.replace(" ", "").lower()

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔍 データベースをスキャンして修正中...")
    
    # 全アーティスト取得
    cursor.execute("SELECT id, name, reading FROM artists")
    artists = cursor.fetchall()
    
    fixed_count = 0
    still_broken = []

    for artist_id, name, current_reading in artists:
        new_reading = None
        
        # 正規化された名前を作成
        norm_name = normalize_name(name)
        
        # 1. 辞書マッチング (正規化ネームで検索)
        # 辞書のキー側も正規化して比較する
        for k, v in ENGLISH_TO_KANA.items():
            if normalize_name(k) == norm_name:
                new_reading = v
                break
        
        # 2. まだダメなら、現在の読み仮名をチェック
        if not new_reading:
            if current_reading:
                # 既にひらがなならOKとする
                if re.match(r'^[ぁ-んー]+$', current_reading.replace(" ", "")):
                    continue
                # もし読み仮名がアルファベットのままなら、それを修正対象とする
                if re.match(r'^[a-z0-9\s]+$', current_reading):
                     # ここで簡易ローマ字変換を試してもいいが、今回は報告させる
                     pass

        # 更新処理
        if new_reading:
            if current_reading != new_reading:
                cursor.execute("UPDATE artists SET reading = ? WHERE id = ?", (new_reading, artist_id))
                fixed_count += 1
        else:
            # 読み仮名がない、またはひらがなじゃない場合（未対応リストへ）
            if not current_reading or not re.match(r'^[ぁ-んー]+$', current_reading.replace(" ", "")):
                still_broken.append(name)

    conn.commit()
    conn.close()

    print(f"\n✅ {fixed_count} 件のアーティスト（AKB等）を修正しました！")
    
    if still_broken:
        print("\n" + "="*50)
        print(f"⚠️ まだ読み仮名が正しくないアーティスト ({len(still_broken)}件)")
        print("以下のリストをコピーして、チャットに貼り付けてください")
        print("="*50)
        # 長すぎると困るので最初の100件を表示
        for name in still_broken[:200]:
            print(name)
        
        if len(still_broken) > 200:
            print(f"... 他 {len(still_broken) - 200} 件")
    else:
        print("\n🎉 おめでとうございます！全てのアーティストが正常に処理されました。")

if __name__ == "__main__":
    main()