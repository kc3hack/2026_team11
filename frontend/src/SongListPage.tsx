import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { getSongs, UserRange, getFavoriteArtists, addFavoriteArtist, removeFavoriteArtist, getFavorites, addFavorite, removeFavorite, Song } from './api';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from './contexts/AuthContext';

interface ArtistSummary {
  id: number;
  name: string;
  slug: string;
  reading: string;
  consonantRow: number;
  songCount: number;
}

/* キーバッジの色設定 */
const keyBadge = (key: number, fit?: string) => {
  const label = key === 0 ? "±0" : key > 0 ? `+${key}` : `${key}`;
  let color: string;
  if (fit === "perfect") color = "bg-emerald-900/30 text-emerald-400 border border-emerald-500/30";
  else if (fit === "good") color = "bg-sky-900/30 text-sky-400 border border-sky-500/30";
  else if (fit === "ok") color = "bg-amber-900/30 text-amber-400 border border-amber-500/30";
  else if (fit === "hard") color = "bg-rose-900/30 text-rose-400 border border-rose-500/30";
  else color = "bg-slate-800 text-slate-500 border border-slate-700";
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-6 rounded-full text-xs font-bold ${color}`}>
      {label}
    </span>
  );
};

const INDEX_KANA = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];

/**
 * slugの先頭文字から五十音の行番号を返す
 */
const getConsonantRow = (slug: string): number => {
  if (!slug) return 99;
  const ch = slug.charAt(0);
  let code = ch.codePointAt(0) ?? 0;

  // カタカナ → ひらがなに正規化
  if (code >= 0x30A1 && code <= 0x30F6) code -= 0x60;

  // ひらがな範囲判定
  if (code >= 0x3041 && code <= 0x3093) {
    if (code <= 0x304A) return 0;
    if (code <= 0x3054) return 1;
    if (code <= 0x305E) return 2;
    if (code <= 0x3069) return 3;
    if (code <= 0x306E) return 4;
    if (code <= 0x307D) return 5;
    if (code <= 0x3082) return 6;
    if (code <= 0x3088) return 7;
    if (code <= 0x308D) return 8;
    return 9;
  }

  // ローマ字
  const lower = ch.toLowerCase();
  const ROMAJI_MAP: Record<string, number> = {
    a: 0, i: 0, u: 0, e: 0, o: 0,
    k: 1, g: 1,
    s: 2, z: 2, j: 2,
    t: 3, d: 3, c: 3,
    n: 4,
    h: 5, b: 5, p: 5, f: 5,
    m: 6,
    y: 7,
    r: 8, l: 8,
    w: 9,
  };
  if (ROMAJI_MAP[lower] !== undefined) return ROMAJI_MAP[lower];

  return 99;
};

const SEARCH_ALIASES: Record<string, string> = {
  // === 超定番・現代ポップス・ロック ===
  "ミセス": "Mrs. GREEN APPLE",
  "みせす": "Mrs. GREEN APPLE",
  "ヒゲダン": "Official髭男dism",
  "ひげだん": "Official髭男dism",
  "ワンオク": "ONE OK ROCK",
  "わんおく": "ONE OK ROCK",
  "バウンディ": "Vaundy",
  "ばうんでぃ": "Vaundy",
  "キングヌー": "King Gnu",
  "きんぐぬー": "King Gnu",
  "ヌー": "King Gnu",
  "ヨアソビ": "YOASOBI",
  "よあそび": "YOASOBI",
  "セカオワ": "SEKAI NO OWARI",
  "せかおわ": "SEKAI NO OWARI",
  "ラッド": "RADWIMPS",
  "らっど": "RADWIMPS",
  "ヨルシカ": "ヨルシカ", // そのままですが表記ゆれ対策
  "ずとまよ": "ずっと真夜中でいいのに。",
  "ズトマヨ": "ずっと真夜中でいいのに。",
  "マカエン": "マカロニえんぴつ",
  "まかえん": "マカロニえんぴつ",
  "サウシー": "Saucy Dog",
  "さうしー": "Saucy Dog",
  "リョクシャカ": "緑黄色社会",
  "りょくしゃか": "緑黄色社会",
  "マイヘア": "My Hair is Bad",
  "まいへあ": "My Hair is Bad",
  "ノベブラ": "Novelbright",
  "ノーベル": "Novelbright",
  "ビーファ": "BE:FIRST",
  "びーふぁ": "BE:FIRST",
  
  // === 英語名のカタカナ読み ===
  "アド": "Ado",
  "あど": "Ado",
  "ユーリ": "優里",
  "ゆうり": "優里",
  "エメ": "Aimer",
  "えめ": "Aimer",
  "ユーアールユー": "Uru",
  "ウル": "Uru",
  "ミレイ": "milet",
  "みれい": "milet",
  "イヴ": "Eve",
  "いゔ": "Eve",
  "いぶ": "Eve",
  "オーサム": "Awesome City Club",
  "ディッシュ": "DISH//",
  "でぃっしゅ": "DISH//",
  "バックナンバー": "back number",
  "ばっくなんばー": "back number",

  // === レジェンド・定番バンド ===
  "ミスチル": "Mr.Children",
  "みすちる": "Mr.Children",
  "ポルノ": "ポルノグラフィティ",
  "ぽるの": "ポルノグラフィティ",
  "バンプ": "BUMP OF CHICKEN",
  "ばんぷ": "BUMP OF CHICKEN",
  "アジカン": "ASIAN KUNG-FU GENERATION",
  "あじかん": "ASIAN KUNG-FU GENERATION",
  "エルレ": "ELLEGARDEN",
  "えるれ": "ELLEGARDEN",
  "ウーバー": "UVERworld",
  "うーばー": "UVERworld",
  "ラルク": "L'Arc~en~Ciel",
  "らるく": "L'Arc~en~Ciel",
  "ブルハ": "THE BLUE HEARTS",
  "ぶるは": "THE BLUE HEARTS",
  "モンパチ": "MONGOL800",
  "もんぱち": "MONGOL800",
  "ドロス": "![Alexandros]",
  "アレキ": "![Alexandros]",
  "カナブーン": "KANA-BOON",
  "かなぶーん": "KANA-BOON",
  "ホルモン": "マキシマム ザ ホルモン",
  "マンウィズ": "MAN WITH A MISSION",
  "テンフィ": "10-FEET",
  "てんふぃ": "10-FEET",
  "スピッツ": "スピッツ", // そのままだが英語で探す人向け
  "spitz": "スピッツ",

  // === グループ・アイドル・その他 ===
  "ドリカム": "DREAMS COME TRUE",
  "どりかむ": "DREAMS COME TRUE",
  "いきもの": "いきものがかり",
  "エグザイル": "EXILE",
  "えぐざいる": "EXILE",
  "三代目": "三代目 J SOUL BROTHERS from EXILE TRIBE",
  "ジェネ": "GENERATIONS from EXILE TRIBE",
  "ストーンズ": "SixTONES",
  "すとーんず": "SixTONES",
  "スノ": "Snow Man",
  "すの": "Snow Man",
  "エイト": "関ジャニ∞",
  "キンキ": "KinKi Kids",
  "ももクロ": "ももいろクローバーZ",
  "モー娘。": "モーニング娘。",
  "ニジュー": "NiziU",
  "にじゅー": "NiziU",
  "パフューム": "Perfume",
  "ぱふゅーむ": "Perfume",
  "ビッシュ": "BiSH",
  "びっしゅ": "BiSH",

  // === よくある略称（ソロアーティスト等） ===
  "ユーミン": "松任谷由実",
  "ゆーみん": "松任谷由実",
  "林檎": "椎名林檎",
  "りんご": "椎名林檎",
  "事変": "東京事変",
  "じへん": "東京事変",
  "源さん": "星野源",
  "げんさん": "星野源"
};

const SongListPage: React.FC<{ searchQuery?: string; userRange?: UserRange | null; onLoginClick?: () => void }> = ({ searchQuery = "", userRange, onLoginClick }) => {
  const { isAuthenticated } = useAuth();
  // --- States ---
  const [songs, setSongs] = useState<Song[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [artistPage, setArtistPage] = useState(0);
  const ARTISTS_PER_PAGE = 10;
  const [pageInput, setPageInput] = useState("1");
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  const FETCH_LIMIT = 10000;

  // --- Effects ---
  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    setArtistPage(0);
    setSelectedArtist(null);
    fetchSongs();
  }, [searchQuery, userRange]);

  useEffect(() => {
    setPageInput((artistPage + 1).toString());
  }, [artistPage]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteSongIds(new Set());
      return;
    }
    getFavorites(500)
      .then(favs => setFavoriteSongIds(new Set(favs.map(f => f.song_id))))
      .catch(err => console.error("お気に入り曲取得失敗:", err));
  }, [isAuthenticated]);

  // --- API Handlers ---
  const fetchFavorites = async () => {
    try {
      const favs = await getFavoriteArtists();
      setFavoriteIds(favs.map(f => f.artist_id));
    } catch (e) { console.error("お気に入り同期失敗", e); }
  };

  const fetchSongs = async () => {
    setLoading(true);
    try {
      // 検索クエリを略称辞書で変換（ヒットしなければそのままのクエリを使用）
      const effectiveQuery = SEARCH_ALIASES[searchQuery] || searchQuery;
      
      const data = await getSongs(FETCH_LIMIT, 0, effectiveQuery, userRange);
      setSongs(data);
      setError(null);
    } catch (err: any) {
      setError("楽曲の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    try {
      if (favoriteIds.includes(id)) {
        await removeFavoriteArtist(id);
        setFavoriteIds(prev => prev.filter(fid => fid !== id));
      } else {
        await addFavoriteArtist(id, name);
        setFavoriteIds(prev => [...prev, id]);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "ログインが必要、または上限10組です");
    }
  };

  const handleToggleFavoriteSong = useCallback(async (songId: number) => {
    if (!isAuthenticated) {
      onLoginClick?.();
      return;
    }
    if (togglingIds.has(songId)) return;

    const wasFavorite = favoriteSongIds.has(songId);

    setFavoriteSongIds(prev => {
      const next = new Set(prev);
      wasFavorite ? next.delete(songId) : next.add(songId);
      return next;
    });
    setTogglingIds(prev => new Set(prev).add(songId));

    try {
      if (wasFavorite) {
        await removeFavorite(songId);
      } else {
        await addFavorite(songId);
      }
    } catch (err) {
      console.error("お気に入り曲更新失敗:", err);
      setFavoriteSongIds(prev => {
        const next = new Set(prev);
        wasFavorite ? next.add(songId) : next.delete(songId);
        return next;
      });
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  }, [isAuthenticated, favoriteSongIds, togglingIds, onLoginClick]);

  // --- Logic ---
  const allArtistList: ArtistSummary[] = useMemo(() => {
    const map = new Map<string, ArtistSummary>();
    songs.forEach(s => {
      const artistName = s.artist || "不明";
      const slug = s.artist_slug || artistName;
      const reading = s.artist_reading || slug;
      if (!map.has(artistName)) {
        map.set(artistName, { id: s.artist_id, name: artistName, slug, reading, consonantRow: getConsonantRow(reading), songCount: 0 });
      }
      map.get(artistName)!.songCount++;
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.consonantRow !== b.consonantRow) return a.consonantRow - b.consonantRow;
      return a.reading.localeCompare(b.reading, "ja");
    });
  }, [songs]);

  const totalPages = Math.ceil(allArtistList.length / ARTISTS_PER_PAGE);
  const visibleArtists = useMemo(() => {
    const start = artistPage * ARTISTS_PER_PAGE;
    return allArtistList.slice(start, start + ARTISTS_PER_PAGE);
  }, [allArtistList, artistPage]);

  const artistSongs = useMemo(() => {
    if (!selectedArtist) return [];
    return songs.filter(s => s.artist === selectedArtist).sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }, [songs, selectedArtist]);

  // --- UI Handlers ---
  const handleNext = () => { if (artistPage + 1 < totalPages) setArtistPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handlePrev = () => { if (artistPage > 0) setArtistPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handlePageJump = () => {
    let p = parseInt(pageInput, 10);
    if (isNaN(p)) { setPageInput((artistPage + 1).toString()); return; }
    if (p < 1) p = 1; if (p > totalPages) p = totalPages;
    setArtistPage(p - 1); setPageInput(p.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleIndexJump = (char: string) => {
    const targetRow = INDEX_KANA.indexOf(char);
    if (targetRow === -1) return;
    const index = allArtistList.findIndex(artist => artist.consonantRow >= targetRow);
    if (index !== -1) { setArtistPage(Math.floor(index / ARTISTS_PER_PAGE)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  if (selectedArtist) {
    return (
      <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
        <div className="w-full max-w-5xl mb-6">
          <button
            onClick={() => setSelectedArtist(null)}
            className="text-slate-400 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors mb-4"
          >
            ← アーティスト一覧に戻る
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg ring-2 ring-white/10">
              {selectedArtist.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md">{selectedArtist}</h1>
              <p className="text-sm text-slate-400">{artistSongs.length}曲</p>
            </div>
          </div>
        </div>

        {/* 曲テーブル */}
        <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-md shadow-xl rounded-xl overflow-hidden border border-white/10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-xs text-slate-400 uppercase border-b border-white/5">
                <th className="py-3 px-5 font-medium">#</th>
                <th className="py-3 px-4 font-medium">Title</th>
                <th className="py-3 px-4 font-medium">Lowest</th>
                <th className="py-3 px-4 font-medium">Highest</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Falsetto</th>
                {userRange && <th className="py-3 px-4 font-medium text-center">Key</th>}
                <th className="py-3 px-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {artistSongs.map((song, i) => (
                <tr key={song.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm group">
                  <td className="py-3 px-5 text-slate-500 text-xs">{i + 1}</td>
                  
                  {/* ▼▼▼ ここから修正：曲名をGoogle歌詞検索へのリンクに変更 ▼▼▼ */}
                  <td className="py-3 px-4 font-medium">
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${selectedArtist} ${song.title} 歌詞`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-200 hover:text-cyan-400 transition-colors inline-flex items-center gap-1 group/link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {song.title}
                      {/* 外部リンクを示す小さなアイコン */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-slate-500 group-hover/link:text-cyan-400 transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  </td>
                  {/* ▲▲▲ ここまで修正 ▲▲▲ */}

                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{song.lowest_note || '-'}</td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{song.highest_note || '-'}</td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap hidden sm:table-cell">{song.falsetto_note || '-'}</td>
                  {userRange && (
                    <td className="py-3 px-4 text-center">
                      {song.recommended_key !== undefined
                        ? keyBadge(song.recommended_key, song.fit)
                        : <span className="text-slate-600">-</span>}
                    </td>
                  )}
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavoriteSong(song.id); }}
                      disabled={togglingIds.has(song.id)}
                      className="p-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {favoriteSongIds.has(song.id)
                        ? <HeartIconSolid className="w-5 h-5 text-rose-500" />
                        : <HeartIcon className="w-5 h-5 text-slate-500 hover:text-rose-400" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
      <div className="w-full max-w-3xl flex flex-col mb-4 gap-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">アーティスト一覧</h1>
            <p className="text-xs text-slate-400">{userRange ? "音域に合わせたキーおすすめを表示中" : "録音するとキーおすすめが表示されます"}</p>
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {INDEX_KANA.map(char => (
              <button
                key={char}
                onClick={() => handleIndexJump(char)}
                className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded hover:bg-cyan-900/30 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors shadow-sm"
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-rose-400 mb-4">{error}</p>}
      {loading && <p className="mt-6 text-slate-500">読み込み中...</p>}

      <div className="w-full max-w-3xl bg-slate-900/60 backdrop-blur-md rounded-xl shadow-xl border border-white/10 overflow-hidden">
        {visibleArtists.map((artist) => (
          <div key={artist.id} className="flex items-center w-full border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
            <button
              onClick={() => setSelectedArtist(artist.name)}
              className="flex-1 flex items-center justify-between p-4 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10">
                  {artist.name.charAt(0)}
                </div>
                <p className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{artist.name}</p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">{artist.songCount}曲</span>
            </button>

            <button
              onClick={(e) => toggleFavorite(e, artist.id, artist.name)}
              className="p-4 transition-transform hover:scale-125"
            >
              {favoriteIds.includes(artist.id) ? (
                <StarSolid className="w-6 h-6 text-amber-400" />
              ) : (
                <StarOutline className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>
        ))}
      </div>

      {!loading && allArtistList.length > ARTISTS_PER_PAGE && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={handlePrev}
            disabled={artistPage === 0}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
          >
            前のページ
          </button>
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageJump}
              onKeyDown={(e) => e.key === 'Enter' && handlePageJump()}
              className="w-12 h-9 text-center bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500/50 text-slate-200"
            />
            <span>/ {totalPages}</span>
          </div>
          <button
            onClick={handleNext}
            disabled={artistPage + 1 >= totalPages}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
          >
            次のページ
          </button>
        </div>
      )}
    </div>
  );
};

export default SongListPage;