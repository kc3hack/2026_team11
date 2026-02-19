import React, { useEffect, useState } from 'react';
import { getSongs, UserRange } from './api';

interface Song {
    id: number;
    title: string;
    artist: string;
    lowest_note: string | null;
    highest_note: string | null;
    falsetto_note: string | null;
    note: string | null;
    source: string;
    recommended_key?: number;
    fit?: string;
}

interface SongListPageProps {
    searchQuery?: string;
    userRange?: UserRange | null;
}

/* キーバッジの色 */
const keyBadge = (key: number, fit?: string) => {
    const label = key === 0 ? "±0" : key > 0 ? `+${key}` : `${key}`;

    let color: string;
<<<<<<< Updated upstream
    if (fit === "perfect") color = "bg-emerald-100 text-emerald-700";
    else if (fit === "good") color = "bg-sky-100 text-sky-700";
    else if (fit === "ok") color = "bg-amber-100 text-amber-700";
    else if (fit === "hard") color = "bg-rose-100 text-rose-600";
    else color = "bg-slate-100 text-slate-400";

=======
    if (fit === "perfect") color = "bg-emerald-900/30 text-emerald-400 border border-emerald-500/30";
    else if (fit === "good") color = "bg-sky-900/30 text-sky-400 border border-sky-500/30";
    else if (fit === "ok") color = "bg-amber-900/30 text-amber-400 border border-amber-500/30";
    else if (fit === "hard") color = "bg-rose-900/30 text-rose-400 border border-rose-500/30";
    else color = "bg-slate-800 text-slate-500 border border-slate-700";
>>>>>>> Stashed changes
    return (
        <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-6 rounded-full text-xs font-bold ${color}`}>
            {label}
        </span>
    );
};

const SongListPage: React.FC<SongListPageProps> = ({ searchQuery = "", userRange }) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const LIMIT = 20;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchSongs();
    }, [page, debouncedQuery, userRange]);

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const data = await getSongs(LIMIT, page * LIMIT, debouncedQuery, userRange);
            setSongs(data);
            setError(null);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            setError(`楽曲の取得に失敗しました: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (songs.length === LIMIT) setPage(p => p + 1);
    };
    const handlePrev = () => {
        if (page > 0) setPage(p => p - 1);
    };

    const hasKeyData = userRange && songs.some(s => s.recommended_key !== undefined);

<<<<<<< Updated upstream
=======
    // =========================================================
    // アーティスト詳細ビュー（曲一覧）
    // =========================================================
    if (selectedArtist) {
        return (
            <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
                {/* 戻るボタン + アーティスト名 */}
                <div className="w-full max-w-5xl mb-6">
                    <button
                        onClick={handleBack}
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
                                {hasKeyData && <th className="py-3 px-4 font-medium text-center">Key</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {artistSongs.map((song, i) => (
                                <tr key={song.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm group">
                                    <td className="py-3 px-5 text-slate-500 text-xs">{i + 1}</td>
                                    <td className="py-3 px-4 text-slate-200 font-medium group-hover:text-white transition-colors">{song.title}</td>
                                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{song.lowest_note || '-'}</td>
                                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{song.highest_note || '-'}</td>
                                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap hidden sm:table-cell">{song.falsetto_note || '-'}</td>
                                    {hasKeyData && (
                                        <td className="py-3 px-4 text-center">
                                            {song.recommended_key !== undefined
                                                ? keyBadge(song.recommended_key, song.fit)
                                                : <span className="text-slate-600">-</span>}
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

    // =========================================================
    // アーティスト一覧ビュー（デフォルト）
    // =========================================================
>>>>>>> Stashed changes
    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">楽曲一覧</h1>

            {userRange && (
                <p className="text-xs text-slate-400 mb-4">
                    あなたの音域に合わせたキーおすすめを表示中
                </p>
            )}
            {!userRange && (
                <p className="text-xs text-slate-400 mb-4">
                    録音するとキーおすすめが表示されます
                </p>
            )}

<<<<<<< Updated upstream
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="w-full max-w-5xl bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 uppercase text-xs leading-normal">
                                <th className="py-3 px-4 text-left">Title</th>
                                <th className="py-3 px-4 text-left">Artist</th>
                                <th className="py-3 px-4 text-left">Lowest</th>
                                <th className="py-3 px-4 text-left">Highest</th>
                                <th className="py-3 px-4 text-left hidden sm:table-cell">Falsetto</th>
                                {hasKeyData && (
                                    <th className="py-3 px-4 text-center">Key</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="text-slate-600 text-sm">
                            {songs.map((song) => (
                                <tr key={song.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 font-bold text-slate-800 max-w-[180px] truncate">{song.title}</td>
                                    <td className="py-3 px-4 text-slate-500 max-w-[140px] truncate">{song.artist}</td>
                                    <td className="py-3 px-4 whitespace-nowrap">{song.lowest_note || '-'}</td>
                                    <td className="py-3 px-4 whitespace-nowrap">{song.highest_note || '-'}</td>
                                    <td className="py-3 px-4 whitespace-nowrap hidden sm:table-cell">{song.falsetto_note || '-'}</td>
                                    {hasKeyData && (
                                        <td className="py-3 px-4 text-center">
                                            {song.recommended_key !== undefined
                                                ? keyBadge(song.recommended_key, song.fit)
                                                : <span className="text-slate-300">-</span>
                                            }
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {songs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={hasKeyData ? 6 : 5} className="py-6 text-center text-slate-400">
                                        表示する楽曲がありません
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {loading && <p className="mt-4 text-slate-500">読み込み中...</p>}
=======
            {debouncedQuery && (
                <p className="text-sm text-cyan-400 mb-3 drop-shadow-sm">
                    「{debouncedQuery}」の検索結果 — 表示中: {songs.length}件
                </p>
            )}

            {error && <p className="text-rose-400 mb-4">{error}</p>}

            {/* アーティストカードグリッド */}
            <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {artistList.map((artist) => (
                    <button
                        key={artist.name}
                        onClick={() => handleArtistClick(artist.name)}
                        className="group bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/5 hover:border-cyan-500/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cyan-500/20"
                    >
                        {/* アイコン */}
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3 group-hover:scale-110 transition-transform shadow-sm ring-1 ring-white/10">
                            {artist.name.charAt(0)}
                        </div>
                        {/* アーティスト名 */}
                        <p className="font-bold text-slate-200 text-sm leading-tight truncate group-hover:text-cyan-400 transition-colors">
                            {artist.name}
                        </p>
                        {/* 曲数 */}
                        <p className="text-xs text-slate-500 mt-1">{artist.songCount}曲</p>
                    </button>
                ))}
            </div>

            {songs.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-500">
                    表示する楽曲がありません
                </div>
            )}
>>>>>>> Stashed changes

            <div className="flex gap-4 mt-6">
                <button
                    onClick={handlePrev}
                    disabled={page === 0 || loading}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                    前へ
                </button>
                <span className="flex items-center text-slate-400 text-sm">Page {page + 1}</span>
                <button
                    onClick={handleNext}
                    disabled={songs.length < LIMIT || loading}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                    次へ
                </button>
            </div>
        </div>
    );
};

export default SongListPage;