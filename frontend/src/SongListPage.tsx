import React, { useEffect, useState, useCallback } from 'react';
import { getArtists, getArtistSongs, Artist, UserRange, getFavoriteArtists, addFavoriteArtist, removeFavoriteArtist, getFavorites, addFavorite, removeFavorite, Song, getSongs } from './api';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from './contexts/AuthContext';

/* キーバッジの色設定 */
const keyBadge = (key: number, fit?: string) => {
  const label = key === 0 ? "\u00b10" : key > 0 ? `+${key}` : `${key}`;
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

const INDEX_KANA = ['\u3042', '\u304b', '\u3055', '\u305f', '\u306a', '\u306f', '\u307e', '\u3084', '\u3089', '\u308f'];

/**
 * ひらがな reading の先頭文字から五十音の行番号を返す
 */
const getConsonantRow = (reading: string): number => {
  if (!reading) return 99;
  let code = reading.codePointAt(0) ?? 0;
  if (code >= 0x30A1 && code <= 0x30F6) code -= 0x60;
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
  "ヨルシカ": "ヨルシカ",
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
  "スピッツ": "スピッツ",
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

const ARTISTS_PER_PAGE = 10;
const SONGS_PER_PAGE = 10;

const SongListPage: React.FC<{ 
  searchQuery?: string; 
  userRange?: UserRange | null; 
  onLoginClick?: () => void;
  onSearchChange?: (query: string) => void;
}> = ({ searchQuery = "", userRange, onLoginClick, onSearchChange }) => { 
  const { isAuthenticated } = useAuth();

  // 検索クエリ
  const [activeQuery, setActiveQuery] = useState(searchQuery);
  const [searchInput, setSearchInput] = useState(searchQuery);
  useEffect(() => {
    setActiveQuery(searchQuery);
    setSearchInput(searchQuery);
  }, [searchQuery]);
  const handleSearch = () => {
    setActiveQuery(searchInput);
    if (onSearchChange) {
      onSearchChange(searchInput);
    }
  };

  // アーティスト一覧
  const [artists, setArtists] = useState<Artist[]>([]);
  const [totalArtists, setTotalArtists] = useState(0);
  const [artistPage, setArtistPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 楽曲検索結果
  const [searchSongs, setSearchSongs] = useState<Song[]>([]);
  const [totalSearchSongs, setTotalSearchSongs] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [searchPageInput, setSearchPageInput] = useState("1");
  const [searchLoading, setSearchLoading] = useState(false);

  // 選択中のアーティスト
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [artistSongs, setArtistSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);

  // お気に入りアーティスト
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  // お気に入り曲
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // アーティスト一覧取得
  const fetchArtists = useCallback(async (page: number) => {
    setLoading(true);
    try {
      // 検索クエリを略称辞書で変換（ヒットしなければそのままのクエリを使用）
      const effectiveQuery = SEARCH_ALIASES[activeQuery] || activeQuery;
      const data = await getArtists(ARTISTS_PER_PAGE, page * ARTISTS_PER_PAGE, effectiveQuery);
      setArtists(data.artists);
      setTotalArtists(data.total);
      setError(null);
    } catch (err: any) {
      setError("\u697d\u66f2\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
    } finally {
      setLoading(false);
    }
  }, [activeQuery]);

  // 楽曲検索
  const fetchSearchSongs = useCallback(async (page: number) => {
    if (!activeQuery) {
      setSearchSongs([]);
      setTotalSearchSongs(0);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await getSongs(SONGS_PER_PAGE, page * SONGS_PER_PAGE, activeQuery, userRange);
      setSearchSongs(data.songs);
      setTotalSearchSongs(data.total);
      setError(null);
    } catch (err: any) {
      setError("\u697d\u66f2\u691c\u7d22\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
      setSearchSongs([]);
      setTotalSearchSongs(0);
    } finally {
      setSearchLoading(false);
    }
  }, [activeQuery, userRange]);

  // 検索クエリが変わったらページをリセット（フェッチはページ変更effectで実行）
  useEffect(() => {
    if (activeQuery) {
      setSearchPage(0);
      setSearchPageInput("1");
    } else {
      setArtistPage(0);
      setPageInput("1");
      setSelectedArtist(null);
    }
  }, [activeQuery]);

  // ページが変わったら取得（アーティスト）
  useEffect(() => {
    if (!activeQuery) {
      fetchArtists(artistPage);
      setPageInput((artistPage + 1).toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistPage, activeQuery]);

  // ページが変わったら取得（楽曲検索）
  useEffect(() => {
    if (activeQuery) {
      fetchSearchSongs(searchPage);
      setSearchPageInput((searchPage + 1).toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPage, activeQuery]);

  // お気に入りアーティスト取得
  useEffect(() => {
    getFavoriteArtists()
      .then(favs => setFavoriteIds(favs.map(f => f.artist_id)))
      .catch(e => console.error("\u304a\u6c17\u306b\u5165\u308a\u540c\u671f\u5931\u6557", e));
  }, []);

  // お気に入り曲ID一括取得
  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteSongIds(new Set());
      return;
    }
    getFavorites(500)
      .then(favs => setFavoriteSongIds(new Set(favs.map(f => f.song_id))))
      .catch(err => console.error("\u304a\u6c17\u306b\u5165\u308a\u66f2\u53d6\u5f97\u5931\u6557:", err));
  }, [isAuthenticated]);

  // アーティスト選択時に楽曲取得
  const handleSelectArtist = useCallback(async (artist: Artist) => {
    setSelectedArtist(artist);
    setSongsLoading(true);
    try {
      const songs = await getArtistSongs(artist.id, userRange);
      setArtistSongs(songs);
    } catch (err) {
      console.error("\u697d\u66f2\u53d6\u5f97\u5931\u6557:", err);
      setArtistSongs([]);
    } finally {
      setSongsLoading(false);
    }
  }, [userRange]);

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
      alert(err.response?.data?.detail || "\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3001\u307e\u305f\u306f\u4e0a\u9650\uff11\uff10\u7d44\u3067\u3059");
    }
  };

  // ハートトグル（曲単位）- functional state update で依存を最小化
  const handleToggleFavoriteSong = useCallback(async (songId: number) => {
    if (!isAuthenticated) {
      onLoginClick?.();
      return;
    }

    let wasFavorite = false;
    setFavoriteSongIds(prev => {
      wasFavorite = prev.has(songId);
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
      console.error("\u304a\u6c17\u306b\u5165\u308a\u66f2\u66f4\u65b0\u5931\u6557:", err);
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
  }, [isAuthenticated, onLoginClick]);

  const totalPages = Math.ceil(totalArtists / ARTISTS_PER_PAGE);
  const totalSearchPages = Math.ceil(totalSearchSongs / SONGS_PER_PAGE);

  const handleNext = () => {
    if (activeQuery) {
      if (searchPage + 1 < totalSearchPages) setSearchPage(p => p + 1);
    } else {
      if (artistPage + 1 < totalPages) setArtistPage(p => p + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    if (activeQuery) {
      if (searchPage > 0) setSearchPage(p => p - 1);
    } else {
      if (artistPage > 0) setArtistPage(p => p - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageJump = () => {
    if (activeQuery) {
      let p = parseInt(searchPageInput, 10);
      if (isNaN(p)) { setSearchPageInput((searchPage + 1).toString()); return; }
      if (p < 1) p = 1; if (p > totalSearchPages) p = totalSearchPages;
      setSearchPage(p - 1); setSearchPageInput(p.toString());
    } else {
      let p = parseInt(pageInput, 10);
      if (isNaN(p)) { setPageInput((artistPage + 1).toString()); return; }
      if (p < 1) p = 1; if (p > totalPages) p = totalPages;
      setArtistPage(p - 1); setPageInput(p.toString());
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIndexJump = (char: string) => {
    const targetRow = INDEX_KANA.indexOf(char);
    if (targetRow === -1) return;
    const index = artists.findIndex(a => getConsonantRow(a.reading || "") >= targetRow);
    if (index !== -1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const estimatedOffset = Math.floor((totalArtists / 10) * targetRow);
      const estimatedPage = Math.floor(estimatedOffset / ARTISTS_PER_PAGE);
      setArtistPage(Math.min(estimatedPage, totalPages - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // アーティスト別曲一覧表示
  if (selectedArtist) {
    return (
      <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
        <div className="w-full max-w-5xl mb-6">
          <button
            onClick={() => setSelectedArtist(null)}
            className="text-slate-400 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors mb-4"
          >
            &larr; アーティスト一覧に戻る
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg ring-2 ring-white/10">
              {selectedArtist.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md">{selectedArtist.name}</h1>
              <p className="text-sm text-slate-400">{artistSongs.length}\u66f2</p>
            </div>
          </div>
        </div>

        {songsLoading ? (
          <p className="mt-6 text-slate-500">{'\u8aad\u307f\u8fbc\u307f\u4e2d...'}</p>
        ) : (
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
                    <td className="py-3 px-4 font-medium">
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(`${selectedArtist.name} ${song.title} 歌詞`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-200 hover:text-cyan-400 transition-colors inline-flex items-center gap-1 group/link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {song.title}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-slate-500 group-hover/link:text-cyan-400 transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </a>
                    </td>
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
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
      <div className="w-full max-w-3xl flex flex-col mb-4 gap-4">
        <form 
          className="relative w-full"
          onSubmit={(e) => {
            e.preventDefault(); // エンターキーでのページリロードを防ぐ
            if (onSearchChange) {
              onSearchChange(searchInput);
            }
          }}
        >
          <input
            type="text"
            placeholder="楽曲名・アーティスト名で検索..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-slate-500 shadow-inner transition-all"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          
          {/* クリアボタン (入力がある時のみ表示) */}
          {searchInput && (
            <button
              type="button" // ★重要: エンターキーでこのボタンが誤爆しないように type="button" を追加
              onClick={() => {
                setSearchInput('');
                setActiveQuery('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">
              {activeQuery ? '楽曲検索結果' : 'アーティスト一覧'}
            </h1>
            <p className="text-xs text-slate-400">
              {activeQuery
                ? `"${activeQuery}" の検索結果`
                : (userRange ? "音域に合わせたキーおすすめを表示中" : "録音すると、キーおすすめが表示されます")
              }
            </p>
          </div>
          {!activeQuery && (
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
          )}
        </div>
      </div>

      {error && <p className="text-rose-400 mb-4">{error}</p>}

      {activeQuery ? (
        // 楽曲検索結果表示
        <>
          {searchLoading ? (
            <p className="mt-6 text-slate-500">{'読み込み中...'}</p>
          ) : searchSongs.length === 0 ? (
            <p className="mt-6 text-slate-400 text-center">該当する楽曲が見つかりません</p>
          ) : (
            <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-md shadow-xl rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/50 text-xs text-slate-400 uppercase border-b border-white/5">
                    <th className="py-3 px-5 font-medium">#</th>
                    <th className="py-3 px-4 font-medium">楽曲</th>
                    <th className="py-3 px-4 font-medium">アーティスト</th>
                    <th className="py-3 px-4 font-medium">Lowest</th>
                    <th className="py-3 px-4 font-medium">Highest</th>
                    <th className="py-3 px-4 font-medium hidden sm:table-cell">Falsetto</th>
                    {userRange && <th className="py-3 px-4 font-medium text-center">Key</th>}
                    <th className="py-3 px-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {searchSongs.map((song, i) => (
                    <tr key={song.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm group">
                      <td className="py-3 px-5 text-slate-500 text-xs">{searchPage * SONGS_PER_PAGE + i + 1}</td>
                      <td className="py-3 px-4 font-medium">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${song.artist} ${song.title} 歌詞`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-200 hover:text-cyan-400 transition-colors inline-flex items-center gap-1 group/link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {song.title}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-slate-500 group-hover/link:text-cyan-400 transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{song.artist}</td>
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
          )}

          {/* 楽曲検索結果のページネーション */}
          {!searchLoading && totalSearchSongs > SONGS_PER_PAGE && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handlePrev}
                disabled={searchPage === 0}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
              >
                {'前のページ'}
              </button>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <input
                  type="text"
                  value={searchPageInput}
                  onChange={(e) => setSearchPageInput(e.target.value)}
                  onBlur={handlePageJump}
                  onKeyDown={(e) => e.key === 'Enter' && handlePageJump()}
                  className="w-12 h-9 text-center bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500/50 text-slate-200"
                />
                <span>/ {totalSearchPages}</span>
              </div>
              <button
                onClick={handleNext}
                disabled={searchPage + 1 >= totalSearchPages}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
              >
                {'次のページ'}
              </button>
            </div>
          )}
        </>
      ) : (
        // アーティスト一覧表示
        <>
          {loading && <p className="mt-6 text-slate-500">{'読み込み中...'}</p>}

          <div className="w-full max-w-3xl bg-slate-900/60 backdrop-blur-md rounded-xl shadow-xl border border-white/10 overflow-hidden">
            {artists.map((artist) => (
              <div key={artist.id} className="flex items-center w-full border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <button
                  onClick={() => handleSelectArtist(artist)}
                  className="flex-1 flex items-center justify-between p-4 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10">
                      {artist.name.charAt(0)}
                    </div>
                    <p className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{artist.name}</p>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">{artist.song_count}{'\u66f2'}</span>
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

          {/* アーティスト一覧のページネーション */}
          {!loading && totalArtists > ARTISTS_PER_PAGE && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handlePrev}
                disabled={artistPage === 0}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
              >
                {'\u524d\u306e\u30da\u30fc\u30b8'}
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
                {'\u6b21\u306e\u30da\u30fc\u30b8'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SongListPage;
