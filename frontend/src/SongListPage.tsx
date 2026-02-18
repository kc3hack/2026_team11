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

    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">楽曲一覧</h1>

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

            <div className="flex gap-4 mt-6">
                <button
                    onClick={handlePrev}
                    disabled={page === 0 || loading}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded disabled:opacity-50 hover:bg-slate-300 transition-colors"
                >
                    前へ
                </button>
                <span className="flex items-center text-slate-600 text-sm">Page {page + 1}</span>
                <button
                    onClick={handleNext}
                    disabled={songs.length < LIMIT || loading}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded disabled:opacity-50 hover:bg-slate-300 transition-colors"
                >
                    次へ
                </button>
            </div>
        </div>
    );
};

export default SongListPage;
