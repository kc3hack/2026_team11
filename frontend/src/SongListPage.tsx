import React, { useEffect, useState, useMemo } from 'react';
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

interface ArtistGroup {
    artist: string;
    songs: Song[];
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
    const [openArtists, setOpenArtists] = useState<Set<string>>(new Set());
    const LIMIT = 500; // アーティスト別表示のため多めに取得

    // 検索語句のデバウンス処理
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

    // アーティスト名で50音順にグループ化
    const artistGroups: ArtistGroup[] = useMemo(() => {
        const map = new Map<string, Song[]>();
        for (const song of songs) {
            const artist = song.artist || "不明なアーティスト";
            if (!map.has(artist)) map.set(artist, []);
            map.get(artist)!.push(song);
        }
        // 50音順ソート（日本語ロケール）
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b, "ja"))
            .map(([artist, songs]) => ({
                artist,
                songs: songs.sort((a, b) => a.title.localeCompare(b.title, "ja")),
            }));
    }, [songs]);

    const toggleArtist = (artist: string) => {
        setOpenArtists(prev => {
            const next = new Set(prev);
            if (next.has(artist)) next.delete(artist);
            else next.add(artist);
            return next;
        });
    };

    const expandAll = () => setOpenArtists(new Set(artistGroups.map(g => g.artist)));
    const collapseAll = () => setOpenArtists(new Set());

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
                <p className="text-xs text-slate-400 mb-1">
                    あなたの音域に合わせたキーおすすめを表示中
                </p>
            )}
            {!userRange && (
                <p className="text-xs text-slate-400 mb-1">
                    録音するとキーおすすめが表示されます
                </p>
            )}

            {debouncedQuery && (
                <p className="text-sm text-blue-500 mb-2">
                    「{debouncedQuery}」の検索結果 — {songs.length}件
                </p>
            )}

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* 開く・閉じるボタン */}
            {!loading && artistGroups.length > 0 && (
                <div className="w-full max-w-5xl flex justify-end gap-2 mb-3">
                    <button
                        onClick={expandAll}
                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        すべて開く
                    </button>
                    <span className="text-xs text-slate-300">|</span>
                    <button
                        onClick={collapseAll}
                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        すべて閉じる
                    </button>
                </div>
            )}

            {/* アーティスト別アコーディオン */}
            <div className="w-full max-w-5xl space-y-2">
                {artistGroups.map((group) => {
                    const isOpen = openArtists.has(group.artist);
                    return (
                        <div key={group.artist} className="bg-white rounded-xl shadow-sm overflow-hidden">
                            {/* アーティストヘッダー */}
                            <button
                                onClick={() => toggleArtist(group.artist)}
                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-lg transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
                                        ▶
                                    </span>
                                    <span className="font-bold text-slate-800">{group.artist}</span>
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {group.songs.length}曲
                                    </span>
                                </div>
                            </button>

                            {/* 楽曲リスト */}
                            {isOpen && (
                                <div className="border-t border-slate-100">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-xs text-slate-400 uppercase">
                                                <th className="py-2 px-5 font-medium">Title</th>
                                                <th className="py-2 px-4 font-medium">Lowest</th>
                                                <th className="py-2 px-4 font-medium">Highest</th>
                                                <th className="py-2 px-4 font-medium hidden sm:table-cell">Falsetto</th>
                                                {hasKeyData && (
                                                    <th className="py-2 px-4 font-medium text-center">Key</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.songs.map((song) => (
                                                <tr key={song.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors text-sm">
                                                    <td className="py-2.5 px-5 text-slate-700 font-medium max-w-[220px] truncate">
                                                        {song.title}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{song.lowest_note || '-'}</td>
                                                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{song.highest_note || '-'}</td>
                                                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap hidden sm:table-cell">{song.falsetto_note || '-'}</td>
                                                    {hasKeyData && (
                                                        <td className="py-2.5 px-4 text-center">
                                                            {song.recommended_key !== undefined
                                                                ? keyBadge(song.recommended_key, song.fit)
                                                                : <span className="text-slate-300">-</span>
                                                            }
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}

                {songs.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-400">
                        表示する楽曲がありません
                    </div>
                )}
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