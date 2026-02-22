import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getArtists, getArtistSongs, Artist, UserRange, getFavoriteArtists, addFavoriteArtist, removeFavoriteArtist, getFavorites, addFavorite, removeFavorite, Song, getSongs } from './api';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from './contexts/AuthContext';
import { SEARCH_ALIASES } from './constants/searchAliases';
import SongTable from './components/SongTable';

const INDEX_KANA = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];

const GOJUON_ROWS = [
  { label: 'あ行', kana: ['あ', 'い', 'う', 'え', 'お'] },
  { label: 'か行', kana: ['か', 'き', 'く', 'け', 'こ'] },
  { label: 'さ行', kana: ['さ', 'し', 'す', 'せ', 'そ'] },
  { label: 'た行', kana: ['た', 'ち', 'つ', 'て', 'と'] },
  { label: 'な行', kana: ['な', 'に', 'ぬ', 'ね', 'の'] },
  { label: 'は行', kana: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
  { label: 'ま行', kana: ['ま', 'み', 'む', 'め', 'も'] },
  { label: 'や行', kana: ['や', 'ゆ', 'よ'] },
  { label: 'ら行', kana: ['ら', 'り', 'る', 'れ', 'ろ'] },
  { label: 'わ行', kana: ['わ', 'を', 'ん'] },
];

// 濁音・半濁音→清音マップ
const DAKUTEN_MAP: Record<string, string> = {
  'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
  'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
  'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
  'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
  'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
  'ゔ': 'う',
};

/** reading の先頭文字を基本ひらがなに正規化（カタカナ→ひらがな + 濁音/半濁音→清音） */
function getBaseKana(reading: string): string {
  if (!reading) return '';
  let code = reading.codePointAt(0) ?? 0;
  // カタカナ→ひらがな
  if (code >= 0x30A1 && code <= 0x30F6) code -= 0x60;
  const hira = String.fromCodePoint(code);
  return DAKUTEN_MAP[hira] || hira;
}

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

  // アーティスト一覧
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 五十音タブ: 選択中の行
  const [selectedRow, setSelectedRow] = useState('あ');

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

  // アーティスト全件取得
  const fetchArtists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getArtists(10000, 0);
      setArtists(data.artists);
      setError(null);
    } catch (err: any) {
      setError("楽曲の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

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

  // アーティスト全件を初回ロード
  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  // 検索クエリが変わったらページをリセット
  useEffect(() => {
    if (activeQuery) {
      setSearchPage(0);
      setSearchPageInput("1");
    } else {
      setSelectedArtist(null);
    }
  }, [activeQuery]);

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

  // 五十音グループ化
  type GroupedRow = {
    label: string;
    rowKey: string; // INDEX_KANA の先頭かな（あ, か, さ...）
    sections: { kana: string; artists: Artist[] }[];
  };

  const groupedArtists = useMemo<GroupedRow[]>(() => {
    const kanaMap = new Map<string, Artist[]>();
    for (const artist of artists) {
      const base = getBaseKana(artist.reading || '');
      if (!base) continue;
      const list = kanaMap.get(base) || [];
      list.push(artist);
      kanaMap.set(base, list);
    }

    const result: GroupedRow[] = [];
    for (const row of GOJUON_ROWS) {
      const sections: { kana: string; artists: Artist[] }[] = [];
      for (const k of row.kana) {
        const list = kanaMap.get(k);
        if (list && list.length > 0) {
          sections.push({ kana: k, artists: list });
        }
      }
      if (sections.length > 0) {
        result.push({ label: row.label, rowKey: row.kana[0], sections });
      }
    }
    return result;
  }, [artists]);

  // 選択中の行だけ抽出
  const activeRow = useMemo(() => {
    return groupedArtists.find(row => row.rowKey === selectedRow) || null;
  }, [groupedArtists, selectedRow]);

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
  }, [isAuthenticated, onLoginClick, favoriteSongIds]);

  const totalSearchPages = Math.ceil(totalSearchSongs / SONGS_PER_PAGE);

  const handleNext = () => {
    if (searchPage + 1 < totalSearchPages) setSearchPage(p => p + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    if (searchPage > 0) setSearchPage(p => p - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageJump = () => {
    let p = parseInt(searchPageInput, 10);
    if (isNaN(p)) { setSearchPageInput((searchPage + 1).toString()); return; }
    if (p < 1) p = 1; if (p > totalSearchPages) p = totalSearchPages;
    setSearchPage(p - 1); setSearchPageInput(p.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIndexJump = useCallback((char: string) => {
    setSelectedRow(char);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // アーティスト別曲一覧表示
  if (selectedArtist) {
    return (
      <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
        <div className="w-full max-w-5xl mb-6">
          <button
            onClick={() => setSelectedArtist(null)}
            className="text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-all duration-300 mb-6 drop-shadow-[0_0_5px_rgba(34,211,238,0)] hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
          >
            &larr; アーティスト一覧に戻る
          </button>
          <div className="flex items-center gap-6">
            <div className="relative w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-cyan-400 text-2xl font-bold border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]">
              {selectedArtist.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)] tracking-wider">
                {selectedArtist.name}
              </h1>
              <p className="text-sm text-cyan-400 mt-1 font-bold tracking-widest">{artistSongs.length}{'\u66f2'}</p>
            </div>
          </div>
        </div>

        {songsLoading ? (
          <p className="mt-6 text-slate-500">{'\u8aad\u307f\u8fbc\u307f\u4e2d...'}</p>
        ) : (
          <SongTable
            songs={artistSongs}
            artistNameOverride={selectedArtist.name}
            userRange={userRange ?? null}
            favoriteSongIds={favoriteSongIds}
            togglingIds={togglingIds}
            onToggleFavorite={handleToggleFavoriteSong}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
      <div className="w-full max-w-3xl flex flex-col mb-4 gap-6">
        <form
          className="relative w-full group"
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
            className="w-full pl-10 pr-10 py-3 bg-slate-900/40 backdrop-blur-md border border-cyan-500/30 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.6)] placeholder-slate-500 transition-all duration-300"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />

          {/* クリアボタン (入力がある時のみ表示) */}
          {searchInput && (
            <button
              type="button" // ★重要: エンターキーでこのボタンが誤爆しないように type="button" を追加
              onClick={() => {
                setSearchInput('');
                setActiveQuery('');
                if (onSearchChange) {
                  onSearchChange('');
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)] tracking-wider">
            {activeQuery ? '楽曲検索結果' : 'ARTISTS'}
          </h1>
          <p className="text-xs text-slate-400 font-bold tracking-wide">
            {activeQuery
              ? `"${activeQuery}" の検索結果`
              : (userRange ? "音域に合わせたキーおすすめを表示中" : "録音すると、キーおすすめが表示されます")
            }
          </p>
        </div>
      </div>

      {/* 五十音タブ: sticky で画面上部に固定 */}
      {!activeQuery && (
        <div className="sticky top-0 md:top-[4.5rem] z-40 w-full max-w-3xl bg-slate-900/95 backdrop-blur-md border-b border-cyan-500/20 py-3 px-4 mb-4 -mx-4 sm:-mx-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {INDEX_KANA.map(char => (
              <button
                key={char}
                onClick={() => handleIndexJump(char)}
                className={`w-8 h-8 flex items-center justify-center text-sm font-bold border rounded-sm transition-all duration-300 ${
                  char === selectedRow
                    ? 'bg-cyan-900/60 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]'
                    : 'text-slate-400 bg-slate-900/60 border-cyan-900/50 hover:bg-cyan-900/40 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.6)]'
                }`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-rose-400 mb-4">{error}</p>}

      {activeQuery ? (
        // 楽曲検索結果表示
        <>
          {searchLoading ? (
            <p className="mt-6 text-slate-500">{'読み込み中...'}</p>
          ) : searchSongs.length === 0 ? (
            <p className="mt-6 text-slate-400 text-center">該当する楽曲が見つかりません</p>
          ) : (
            <SongTable
              songs={searchSongs}
              rowOffset={searchPage * SONGS_PER_PAGE}
              showArtistColumn
              userRange={userRange ?? null}
              favoriteSongIds={favoriteSongIds}
              togglingIds={togglingIds}
              onToggleFavorite={handleToggleFavoriteSong}
            />
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
        // アーティスト一覧表示（五十音グループ）
        <>
          {loading && <p className="mt-6 text-slate-500">読み込み中...</p>}

          {activeRow ? (
            <div className="w-full max-w-3xl flex flex-col gap-6">
              {/* 行ヘッダー */}
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                <h2 className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-wider">
                  {activeRow.label}
                </h2>
              </div>

              {/* 段セクション */}
              <div className="flex flex-col gap-3">
                {activeRow.sections.map((section) => (
                  <div key={section.kana} className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-cyan-500/20 overflow-hidden">
                    {/* 段サブヘッダー */}
                    <div className="flex items-center gap-2 px-5 py-2 bg-slate-800/40 border-b border-cyan-500/10">
                      <span className="text-sm font-bold text-cyan-400">{section.kana}</span>
                      <span className="text-xs text-slate-500">{section.artists.length}組</span>
                    </div>

                    {/* アーティスト行 */}
                    {section.artists.map((artist) => (
                      <div key={artist.id} className="group relative flex items-center w-full border-b border-cyan-500/10 last:border-0 hover:bg-cyan-900/20 transition-all duration-300">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(34,211,238,1)] transition-opacity duration-300"></div>
                        <button
                          onClick={() => handleSelectArtist(artist)}
                          className="flex-1 flex items-center justify-between p-4 pl-6 text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-cyan-400 font-bold text-sm border-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] group-hover:shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-300">
                              {artist.name.charAt(0)}
                            </div>
                            <p className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors drop-shadow-[0_0_5px_rgba(34,211,238,0)] group-hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{artist.name}</p>
                          </div>
                          <span className="text-xs text-cyan-400 bg-slate-900/80 px-3 py-1 rounded-sm border border-cyan-500/30 shadow-[0_0_5px_rgba(34,211,238,0.2)]">{artist.song_count}曲</span>
                        </button>

                        <button
                          onClick={(e) => toggleFavorite(e, artist.id, artist.name)}
                          className="p-4 pr-6 transition-transform hover:scale-125 z-10"
                        >
                          {favoriteIds.includes(artist.id) ? (
                            <StarSolid className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                          ) : (
                            <StarOutline className="w-6 h-6 text-slate-500 hover:text-cyan-400 transition-colors" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : !loading && (
            <p className="mt-6 text-slate-400 text-center">該当するアーティストがいません</p>
          )}
        </>
      )}
    </div>
  );
};

export default SongListPage;
