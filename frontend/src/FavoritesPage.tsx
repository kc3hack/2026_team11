import React, { useEffect, useState, useCallback } from 'react';
import { getFavorites, removeFavorite, FavoriteSong, UserRange } from './api';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from './contexts/AuthContext';

interface FavoritesPageProps {
    userRange?: UserRange | null;
    onLoginClick?: () => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ onLoginClick }) => {
    const { isAuthenticated } = useAuth();
    const [favorites, setFavorites] = useState<FavoriteSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        setLoading(true);
        getFavorites(500)
            .then(setFavorites)
            .catch(err => console.error("お気に入り取得失敗:", err))
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    const handleRemove = useCallback(async (songId: number) => {
        if (removingIds.has(songId)) return;

        const removed = favorites.find(f => f.song_id === songId);
        // オプティミスティック更新
        setFavorites(prev => prev.filter(f => f.song_id !== songId));
        setRemovingIds(prev => new Set(prev).add(songId));

        try {
            await removeFavorite(songId);
        } catch (err) {
            console.error("お気に入り削除失敗:", err);
            // ロールバック
            if (removed) {
                setFavorites(prev => [...prev, removed].sort((a, b) => a.title.localeCompare(b.title, "ja")));
            }
        } finally {
            setRemovingIds(prev => {
                const next = new Set(prev);
                next.delete(songId);
                return next;
            });
        }
    }, [favorites, removingIds]);

    // 未ログイン
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-transparent p-8">
                <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8 text-center">
                    <HeartIconSolid className="w-12 h-12 text-rose-500/50 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">お気に入り</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        ログインするとお気に入りの楽曲を保存できます
                    </p>
                    <button
                        onClick={onLoginClick}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl px-6 py-3 text-sm transition-colors shadow-lg shadow-cyan-500/20"
                    >
                        ログインする
                    </button>
                </div>
            </div>
        );
    }

    // ローディング
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-transparent p-8">
                <p className="text-slate-500">読み込み中...</p>
            </div>
        );
    }

    // 0件
    if (favorites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-transparent p-8">
                <div className="text-center">
                    <HeartIconSolid className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">お気に入りはまだありません</h2>
                    <p className="text-slate-400 text-sm">
                        楽曲一覧でハートをタップして追加しましょう
                    </p>
                </div>
            </div>
        );
    }

    // お気に入り一覧
    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-transparent p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">お気に入り</h1>
            <p className="text-sm text-slate-400 mb-6">{favorites.length}曲</p>

            <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-md shadow-xl rounded-xl overflow-hidden border border-white/10">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-800/50 text-xs text-slate-400 uppercase border-b border-white/5">
                            <th className="py-3 px-5 font-medium">#</th>
                            <th className="py-3 px-4 font-medium">Title</th>
                            <th className="py-3 px-4 font-medium">Artist</th>
                            <th className="py-3 px-4 font-medium">Lowest</th>
                            <th className="py-3 px-4 font-medium">Highest</th>
                            <th className="py-3 px-4 font-medium hidden sm:table-cell">Falsetto</th>
                            <th className="py-3 px-2 font-medium w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {favorites.map((fav, i) => (
                            <tr key={fav.favorite_id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm group">
                                <td className="py-3 px-5 text-slate-500 text-xs">{i + 1}</td>
                                <td className="py-3 px-4 text-slate-200 font-medium group-hover:text-white transition-colors">{fav.title}</td>
                                <td className="py-3 px-4 text-slate-400">{fav.artist || '-'}</td>
                                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{fav.lowest_note || '-'}</td>
                                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{fav.highest_note || '-'}</td>
                                <td className="py-3 px-4 text-slate-400 whitespace-nowrap hidden sm:table-cell">{fav.falsetto_note || '-'}</td>
                                <td className="py-3 px-2 text-center">
                                    <button
                                        onClick={() => handleRemove(fav.song_id)}
                                        disabled={removingIds.has(fav.song_id)}
                                        className="p-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                                    >
                                        <HeartIconSolid className="w-5 h-5 text-rose-500" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FavoritesPage;
