import React, { useEffect, useState, useMemo } from 'react';
import { getSongs, UserRange } from './api';

interface Song {
    id: number;
    title: string;
    artist: string;
    artist_reading?: string;
    lowest_note: string | null;
    highest_note: string | null;
    falsetto_note: string | null;
    note: string | null;
    source: string;
    recommended_key?: number;
    fit?: string;
}

interface ArtistSummary {
    name: string;
    reading: string;
    songCount: number;
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

// 50音インデックスのみ
const INDEX_KANA = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];

const SongListPage: React.FC<SongListPageProps> = ({ searchQuery = "", userRange }) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // ページネーション管理
    const [artistPage, setArtistPage] = useState(0);
    const ARTISTS_PER_PAGE = 10;
    const [pageInput, setPageInput] = useState("1");

    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    
    const FETCH_LIMIT = 10000; 

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setArtistPage(0);
            setSelectedArtist(null);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchSongs();
    }, [debouncedQuery, userRange]);

    useEffect(() => {
        setPageInput((artistPage + 1).toString());
    }, [artistPage]);

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const data = await getSongs(FETCH_LIMIT, 0, debouncedQuery, userRange);
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

    // アーティスト別にグループ化
    const allArtistList: ArtistSummary[] = useMemo(() => {
        const map = new Map<string, ArtistSummary>();
        
        for (const song of songs) {
            const artistName = song.artist || "不明";
            // 読み仮名がない場合は名前を小文字にして代用
            const reading = song.artist_reading || artistName.toLowerCase();

            if (!map.has(artistName)) {
                map.set(artistName, { 
                    name: artistName, 
                    reading: reading,
                    songCount: 0 
                });
            }
            const entry = map.get(artistName)!;
            entry.songCount += 1;
        }
        
        // 読み仮名順でソート
        return Array.from(map.values())
             .sort((a, b) => a.reading.localeCompare(b.reading, "ja"));

    }, [songs]);

    const totalPages = Math.ceil(allArtistList.length / ARTISTS_PER_PAGE);

    const visibleArtists = useMemo(() => {
        const start = artistPage * ARTISTS_PER_PAGE;
        return allArtistList.slice(start, start + ARTISTS_PER_PAGE);
    }, [allArtistList, artistPage, ARTISTS_PER_PAGE]);

    const artistSongs: Song[] = useMemo(() => {
        if (!selectedArtist) return [];
        return songs
            .filter(s => s.artist === selectedArtist)
            .sort((a, b) => a.title.localeCompare(b.title, "ja"));
    }, [songs, selectedArtist]);

    const handleArtistClick = (artistName: string) => {
        setSelectedArtist(artistName);
    };

    const handleBack = () => {
        setSelectedArtist(null);
    };

    const handleNext = () => {
        if (artistPage + 1 < totalPages) {
            setArtistPage(p => p + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    const handlePrev = () => {
        if (artistPage > 0) {
            setArtistPage(p => p - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePageJump = () => {
        let p = parseInt(pageInput, 10);
        if (isNaN(p)) {
            setPageInput((artistPage + 1).toString());
            return;
        }
        if (p < 1) p = 1;
        if (p > totalPages) p = totalPages;

        setArtistPage(p - 1);
        setPageInput(p.toString());
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handlePageJump();
            (e.target as HTMLInputElement).blur();
        }
    };

    // ジャンプ機能（50音のみ）
    const handleIndexJump = (char: string) => {
        // ひらがな辞書順で探す
        const index = allArtistList.findIndex(artist => 
            artist.reading.localeCompare(char, 'ja') >= 0
        );
        
        if (index !== -1) {
            const targetPage = Math.floor(index / ARTISTS_PER_PAGE);
            setArtistPage(targetPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // 見つからない場合、'わ' なら末尾へ
            if (char === 'わ' && allArtistList.length > 0) {
                setArtistPage(totalPages - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const hasKeyData = userRange && songs.some(s => s.recommended_key !== undefined);

    if (selectedArtist) {
        return (
            <div className="flex flex-col items-center min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-8">
                <div className="w-full max-w-5xl mb-6">
                    <button
                        onClick={handleBack}
                        className="text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 transition-colors mb-4"
                    >
                        ← アーティスト一覧に戻る
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
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
                                <tr key={song.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors text-sm">
                                    <td className="py-3 px-5 text-slate-400 text-xs">{i + 1}</td>
                                    <td className="py-3 px-4 text-slate-800 font-medium">{song.title}</td>
                                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{song.lowest_note || '-'}</td>
                                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{song.highest_note || '-'}</td>
                                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap hidden sm:table-cell">{song.falsetto_note || '-'}</td>
                                    {hasKeyData && (
                                        <td className="py-3 px-4 text-center">
                                            {song.recommended_key !== undefined
                                                ? keyBadge(song.recommended_key, song.fit)
                                                : <span className="text-slate-300">-</span>}
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
                <div className="flex flex-col md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">楽曲一覧</h1>
                        {userRange ? (
                            <p className="text-xs text-slate-400">あなたの音域に合わせたキーおすすめを表示中</p>
                        ) : (
                            <p className="text-xs text-slate-400">録音するとキーおすすめが表示されます</p>
                        )}
                    </div>
                    {/* インデックスバー（50音のみ） */}
                    <div className="flex flex-wrap gap-1 justify-end">
                        {INDEX_KANA.map(char => (
                            <button
                                key={char}
                                onClick={() => handleIndexJump(char)}
                                className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {debouncedQuery && (
                <p className="text-sm text-blue-500 mb-3 w-full max-w-3xl">
                    「{debouncedQuery}」の検索結果 — 全{allArtistList.length}アーティスト
                </p>
            )}

            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {visibleArtists.map((artist, index) => (
                    <button
                        key={artist.name}
                        onClick={() => handleArtistClick(artist.name)}
                        className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group
                            ${index !== visibleArtists.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            {/* アイコン */}
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                {artist.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                {/* アーティスト名 */}
                                <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {artist.name}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                {artist.songCount}曲
                            </span>
                            <span className="text-slate-300 group-hover:text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </div>
                    </button>
                ))}

                {songs.length === 0 && !loading && (
                    <div className="p-8 text-center text-slate-400">
                        楽曲が見つかりませんでした
                    </div>
                )}
                
                {loading && (
                    <div className="p-8 text-center text-slate-500">
                        読み込み中...
                    </div>
                )}
            </div>

            {!loading && allArtistList.length > ARTISTS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                        onClick={handlePrev}
                        disabled={artistPage === 0}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
                    >
                        前の{ARTISTS_PER_PAGE}件
                    </button>
                    
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onBlur={handlePageJump}
                            onKeyDown={handleKeyDown}
                            className="w-12 h-9 text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-slate-700 font-bold"
                            aria-label="ページ番号"
                        />
                        <span className="text-slate-400">/</span>
                        <span>{totalPages} ページ</span>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={artistPage + 1 >= totalPages}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
                    >
                        次の{ARTISTS_PER_PAGE}件
                    </button>
                </div>
            )}
        </div>
    );
};

export default SongListPage;