import React, { useEffect, useState } from 'react';
import { getSongs } from './api';

// 楽曲データの型定義
interface Song {
    id: number;
    title: string;
    artist: string;
    lowest_note: string | null;
    highest_note: string | null;
    falsetto_note: string | null;
    note: string | null;
    source: string;
}

const SongListPage: React.FC = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const LIMIT = 20;

    useEffect(() => {
        fetchSongs();
    }, [page]);

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const data = await getSongs(LIMIT, page * LIMIT);
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
        if (songs.length === LIMIT) {
            setPage(p => p + 1);
        }
    };

    const handlePrev = () => {
        if (page > 0) {
            setPage(p => p - 1);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-slate-50 p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">楽曲一覧</h1>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* テーブル表示 */}
            <div className="w-full max-w-5xl bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">ID</th>
                                <th className="py-3 px-6 text-left">Title</th>
                                <th className="py-3 px-6 text-left">Artist</th>
                                <th className="py-3 px-6 text-left">Lowest</th>
                                <th className="py-3 px-6 text-left">Highest</th>
                                <th className="py-3 px-6 text-left">Falsetto</th>
                                <th className="py-3 px-6 text-left">Note</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-600 text-sm font-light">
                            {songs.map((song) => (
                                <tr key={song.id} className="border-b border-slate-200 hover:bg-slate-50">
                                    <td className="py-3 px-6 whitespace-nowrap">{song.id}</td>
                                    <td className="py-3 px-6 font-bold">{song.title}</td>
                                    <td className="py-3 px-6">{song.artist}</td>
                                    <td className="py-3 px-6">{song.lowest_note || '-'}</td>
                                    <td className="py-3 px-6">{song.highest_note || '-'}</td>
                                    <td className="py-3 px-6">{song.falsetto_note || '-'}</td>
                                    <td className="py-3 px-6 truncate max-w-xs" title={song.note || ''}>
                                        {song.note || '-'}
                                    </td>
                                </tr>
                            ))}
                            {songs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-400">
                                        表示する楽曲がありません
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {loading && <p className="mt-4 text-slate-500">読み込み中...</p>}

            {/* ページネーション */}
            <div className="flex gap-4 mt-6">
                <button
                    onClick={handlePrev}
                    disabled={page === 0 || loading}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded disabled:opacity-50 hover:bg-slate-300 transition-colors"
                >
                    前へ
                </button>
                <span className="flex items-center text-slate-600">Page {page + 1}</span>
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
