import React, { useEffect, useState, useMemo } from 'react';
import { getSongs, UserRange, getFavoriteArtists, addFavoriteArtist, removeFavoriteArtist, Song } from './api';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

interface ArtistSummary {
    id: number;
    name: string;
    reading: string;
    songCount: number;
}

/* キーバッジの色設定 */
const keyBadge = (key: number, fit?: string) => {
    const label = key === 0 ? "±0" : key > 0 ? `+${key}` : `${key}`;
    let color: string;
    if (fit === "perfect") color = "bg-emerald-100 text-emerald-700";
    else if (fit === "good") color = "bg-sky-100 text-sky-700";
    else if (fit === "ok") color = "bg-amber-100 text-amber-700";
    else if (fit === "hard") color = "bg-rose-100 text-rose-600";
    else color = "bg-slate-100 text-slate-400";
    return (
        <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-6 rounded-full text-xs font-bold ${color}`}>
            {label}
        </span>
    );
};

const INDEX_KANA = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];

const SongListPage: React.FC<{ searchQuery?: string; userRange?: UserRange | null }> = ({ searchQuery = "", userRange }) => {
    // --- States ---
    const [songs, setSongs] = useState<Song[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
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
            const data = await getSongs(FETCH_LIMIT, 0, searchQuery, userRange);
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

    // --- Logic ---
    const allArtistList: ArtistSummary[] = useMemo(() => {
        const map = new Map<string, ArtistSummary>();
        songs.forEach(s => {
            const artistName = s.artist || "不明";
            const reading = s.artist_reading || artistName.toLowerCase();
            if (!map.has(artistName)) {
                map.set(artistName, { id: s.artist_id, name: artistName, reading: reading, songCount: 0 });
            }
            map.get(artistName)!.songCount++;
        });
        return Array.from(map.values()).sort((a, b) => a.reading.localeCompare(b.reading, "ja"));
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
        const index = allArtistList.findIndex(artist => artist.reading.localeCompare(char, 'ja') >= 0);
        if (index !== -1) { setArtistPage(Math.floor(index / ARTISTS_PER_PAGE)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    };

    if (selectedArtist) {
        return (
            <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-8">
                <div className="w-full max-w-5xl mb-6">
                    <button onClick={() => setSelectedArtist(null)} className="text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 mb-4">
                        ← アーティスト一覧に戻る
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                            {selectedArtist.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{selectedArtist}</h1>
                            <p className="text-sm text-slate-400">{artistSongs.length}曲</p>
                        </div>
                    </div>
                </div>
                <div className="w-full max-w-5xl bg-white shadow-md rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-xs text-slate-400 uppercase border-b border-slate-100">
                                <th className="py-3 px-5">#</th>
                                <th className="py-3 px-4">Title</th>
                                <th className="py-3 px-4">Lowest</th>
                                <th className="py-3 px-4">Highest</th>
                                {userRange && <th className="py-3 px-4 text-center">Key</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {artistSongs.map((song, i) => (
                                <tr key={song.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors text-sm">
                                    <td className="py-3 px-5 text-slate-400">{i + 1}</td>
                                    <td className="py-3 px-4 text-slate-800 font-medium">{song.title}</td>
                                    <td className="py-3 px-4 text-slate-500">{song.lowest_note || '-'}</td>
                                    <td className="py-3 px-4 text-slate-500">{song.highest_note || '-'}</td>
                                    {userRange && (
                                        <td className="py-3 px-4 text-center">
                                            {song.recommended_key !== undefined ? keyBadge(song.recommended_key, song.fit) : '-'}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-8">
            <div className="w-full max-w-3xl flex flex-col mb-4 gap-4">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">楽曲一覧</h1>
                        <p className="text-xs text-slate-400">{userRange ? "音域に合わせたキーおすすめを表示中" : "録音するとキーおすすめが表示されます"}</p>
                    </div>
                    {/* ★ あかさたなジャンプボタンを復元 */}
                    <div className="flex flex-wrap gap-1 justify-end">
                        {INDEX_KANA.map(char => (
                            <button
                                key={char}
                                onClick={() => handleIndexJump(char)}
                                className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {visibleArtists.map((artist, index) => (
                    <div key={artist.id} className="flex items-center w-full border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <button
                            onClick={() => setSelectedArtist(artist.name)}
                            className="flex-1 flex items-center justify-between p-4 text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                                    {artist.name.charAt(0)}
                                </div>
                                <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{artist.name}</p>
                            </div>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{artist.songCount}曲</span>
                        </button>
                        
                        {/* ★ お気に入りボタン */}
                        <button
                            onClick={(e) => toggleFavorite(e, artist.id, artist.name)}
                            className="p-4 transition-transform hover:scale-125"
                        >
                            {favoriteIds.includes(artist.id) ? (
                                <StarSolid className="w-6 h-6 text-amber-400" />
                            ) : (
                                <StarOutline className="w-6 h-6 text-slate-300" />
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* ★ ページネーションを復元 */}
            {!loading && allArtistList.length > ARTISTS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                        onClick={handlePrev}
                        disabled={artistPage === 0}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-sm"
                    >
                        前のページ
                    </button>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <input
                            type="text"
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onBlur={handlePageJump}
                            onKeyDown={(e) => e.key === 'Enter' && handlePageJump()}
                            className="w-12 h-9 text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                        />
                        <span>/ {totalPages}</span>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={artistPage + 1 >= totalPages}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-sm"
                    >
                        次のページ
                    </button>
                </div>
            )}
        </div>
    );
};

export default SongListPage;