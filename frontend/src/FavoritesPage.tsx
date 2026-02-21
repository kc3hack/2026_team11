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
                    <HeartIconSolid className="w-12 h-12 text-pink-500/50 mx-auto mb-4 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                    <h2 className="text-xl font-bold text-white mb-2 tracking-widest drop-shadow-md">お気に入り</h2>
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
                    <HeartIconSolid className="w-12 h-12 text-pink-500/30 mx-auto mb-4 drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]" />
                    <h2 className="text-xl font-bold text-white mb-2 tracking-widest drop-shadow-md">お気に入りはまだありません</h2>
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
            <div className="w-full max-w-5xl mb-6">
                <h1 className="text-3xl sm:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-wider">
                    FAVORITES
                </h1>
                <p className="text-sm text-cyan-400 mt-1 font-bold tracking-widest drop-shadow-sm">{favorites.length} 曲</p>
            </div>

            <div className="w-full max-w-5xl bg-slate-900/40 backdrop-blur-xl shadow-[0_0_20px_rgba(236,72,153,0.1)] rounded-xl overflow-hidden border border-pink-500/20">
                <table className="w-full text-left relative">
                    <thead>
                        <tr className="bg-slate-800/50 text-xs text-slate-400 uppercase tracking-widest relative">
                            {/* シアンのグラデーションライン */}
                            <th className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-400 via-cyan-400/50 to-transparent shadow-[0_0_5px_rgba(34,211,238,0.8)]"></th>
                            <th className="py-4 px-5 font-bold">#</th>
                            <th className="py-4 px-4 font-bold">楽曲</th>
                            <th className="py-4 px-4 font-bold">アーティスト</th>
                            <th className="py-4 px-2 font-bold w-12 text-center"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {favorites.map((fav, i) => (
                            <tr key={fav.favorite_id} className="relative group transition-all duration-300 hover:bg-cyan-900/20 border-b border-white/5 last:border-0 hover:border-transparent text-sm">
                                {/* ホバー時のシアンのネオンライン */}
                                <td className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(34,211,238,1)] transition-opacity duration-300"></td>

                                <td className="py-4 px-5 text-slate-500 text-xs group-hover:text-cyan-300 transition-colors font-mono">{i + 1}</td>
                                <td className="py-4 px-4 text-slate-200 font-bold group-hover:text-white transition-colors tracking-wide drop-shadow-sm">{fav.title}</td>
                                <td className="py-4 px-4 text-slate-400 group-hover:text-slate-300 transition-colors">{fav.artist || '-'}</td>
                                <td className="py-4 px-2 text-center">
                                    <button
                                        onClick={() => handleRemove(fav.song_id)}
                                        disabled={removingIds.has(fav.song_id)}
                                        className="p-2 rounded-full hover:bg-pink-500/10 transition-all duration-300 disabled:opacity-50 group/btn"
                                    >
                                        <HeartIconSolid className="w-5 h-5 text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] group-hover/btn:drop-shadow-[0_0_18px_rgba(236,72,153,1)] group-hover/btn:scale-110 transition-all duration-300" />
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
