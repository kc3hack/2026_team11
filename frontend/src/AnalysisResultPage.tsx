import React from 'react';

interface AnalysisResultPageProps {
    result: any | null;
}

/* キーバッジ */
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

/* 難易度バッジ (match_score ベース) */
const difficultyBadge = (score: number) => {
    if (score >= 80) return <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-600">Easy</span>;
    if (score >= 60) return <span className="text-xs font-bold px-2 py-1 rounded-md bg-yellow-100 text-yellow-600">Medium</span>;
    return <span className="text-xs font-bold px-2 py-1 rounded-md bg-rose-100 text-rose-600">Hard</span>;
};

/* レーダーチャート (CSS/SVG ベース、ライブラリ不要) */
const RadarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const cx = 120, cy = 120, r = 90;
    const n = data.length;
    if (n === 0) return null;

    // 各軸の角度
    const angles = data.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);

    // グリッド (3段)
    const gridLevels = [0.33, 0.66, 1.0];

    // データポリゴンの点
    const points = data.map((d, i) => {
        const ratio = d.value / 100;
        const x = cx + r * ratio * Math.cos(angles[i]);
        const y = cy + r * ratio * Math.sin(angles[i]);
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg viewBox="0 0 240 240" className="w-full h-full max-w-[250px] max-h-[250px]">
            {/* グリッド */}
            {gridLevels.map((level, li) => {
                const gridPoints = angles.map((a) => {
                    const x = cx + r * level * Math.cos(a);
                    const y = cy + r * level * Math.sin(a);
                    return `${x},${y}`;
                }).join(" ");
                return <polygon key={li} points={gridPoints} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
            })}

            {/* 軸 */}
            {angles.map((a, i) => (
                <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" />
            ))}

            {/* データ */}
            <polygon points={points} fill="rgba(167,139,250,0.4)" stroke="#8b5cf6" strokeWidth="2.5" />

            {/* ラベル */}
            {data.map((d, i) => {
                const labelR = r + 22;
                const x = cx + labelR * Math.cos(angles[i]);
                const y = cy + labelR * Math.sin(angles[i]);
                return (
                    <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                        className="fill-slate-500 text-[11px] font-medium">
                        {d.label}
                    </text>
                );
            })}
        </svg>
    );
};

const AnalysisResultPage: React.FC<AnalysisResultPageProps> = ({ result }) => {
    // データがない場合
    if (!result || result.error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 p-8">
                <div className="text-6xl mb-4">🎤</div>
                <p className="text-lg font-bold mb-2">まだ分析結果がありません</p>
                <p className="text-sm">録音して音域を測定すると、ここに結果が表示されます</p>
            </div>
        );
    }

    const chestMin = result.chest_min || result.overall_min || "-";
    const chestMax = result.chest_max || result.overall_max || "-";
    const falsettoMin = result.falsetto_min || null;
    const falsettoMax = result.falsetto_max || null;
    const overallMin = result.overall_min || chestMin;
    const overallMax = result.overall_max || (falsettoMax || chestMax);
    const chestRatio = result.chest_ratio ?? 100;
    const falsettoRatio = result.falsetto_ratio ?? 0;

    const voiceType = result.voice_type || {};
    const songs = result.recommended_songs || [];
    const artists = result.similar_artists || [];
    const singing = result.singing_analysis || {};

    // レーダーチャート用データ（バックエンドは range_score, stability_score 等を直接返す）
    const hasScores = singing.range_score !== undefined;
    const radarData = hasScores ? [
        { label: "音域", value: singing.range_score ?? 0 },
        { label: "安定性", value: singing.stability_score ?? 0 },
        { label: "表現力", value: singing.expression_score ?? 0 },
        { label: "総合", value: singing.overall_score ?? 0 },
    ] : [];

    // ランク計算（バックエンドにrankフィールドがないので自前計算）
    const overallScore = singing.overall_score ?? 0;
    const computedRank = overallScore >= 90 ? "S" : overallScore >= 80 ? "A" : overallScore >= 65 ? "B" : overallScore >= 50 ? "C" : "D";

    const rankColor = (rank: string) => {
        if (rank === "S") return "text-amber-500";
        if (rank === "A") return "text-violet-500";
        if (rank === "B") return "text-blue-500";
        if (rank === "C") return "text-emerald-500";
        return "text-slate-400";
    };

    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-transparent p-6 font-sans text-slate-200">
            {/* Page Title */}
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-8 self-start drop-shadow-sm">
                分析結果
            </h1>

            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* 音域カード */}
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8">
                        <h2 className="text-xl font-bold mb-4 text-white">音域チェック結果</h2>

                        <div className="flex items-center space-x-4 mb-4">
                            <div className="px-4 py-2 bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 rounded-full font-bold text-sm">
                                あなたの音域
                            </div>
                            <div className="text-4xl font-extrabold text-white">
                                {overallMin} <span className="text-slate-500 mx-2">~</span> {overallMax}
                            </div>
                        </div>

                        {/* 地声 / 裏声の詳細 */}
                        <div className="flex flex-wrap gap-4 mb-6 text-sm">
                            <div className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                <span className="text-slate-300">地声</span>
                                <span className="font-bold text-slate-100">{chestMin} ~ {chestMax}</span>
                            </div>
                            {falsettoMin && falsettoMax && (
                                <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                    <span className="text-slate-300">裏声</span>
                                    <span className="font-bold text-slate-100">{falsettoMin} ~ {falsettoMax}</span>
                                </div>
                            )}
                        </div>

                        {/* Voice Type */}
                        {voiceType.voice_type && (
                            <p className="text-slate-400 leading-relaxed mb-6">
                                あなたの声質タイプ: <span className="font-bold text-white">{voiceType.voice_type}</span>
                                {voiceType.description && <span className="text-slate-500 ml-1">— {voiceType.description}</span>}
                            </p>
                        )}

                        {/* Voice Type Ratio Bar */}
                        <div className="mb-2">
                            <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Voice Type Ratio</h3>
                            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex border border-white/5">
                                <div className="h-full bg-indigo-500 transition-all opacity-80" style={{ width: `${chestRatio}%` }}></div>
                                <div className="h-full bg-emerald-400 transition-all opacity-80" style={{ width: `${falsettoRatio}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span className="flex items-center">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></div>
                                    地声 ({chestRatio}%)
                                </span>
                                <span className="flex items-center">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-1"></div>
                                    裏声 ({falsettoRatio}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 似ているアーティスト */}
                    {artists.length > 0 && (
                        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-6">
                            <h2 className="text-lg font-bold text-white mb-4">声が似ているアーティスト</h2>
                            <div className="flex flex-wrap gap-3">
                                {artists.slice(0, 6).map((a: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-4 py-2 rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-bold text-slate-200">{a.name}</span>
                                        <span className="text-xs text-slate-500">{Math.round(a.similarity_score)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="space-y-8">
                    {/* レーダーチャート */}
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-6 flex flex-col items-center">
                        <h2 className="text-lg font-bold text-white mb-4 self-start">歌唱力分析</h2>
                        {radarData.length > 0 ? (
                            <>
                                <div className="w-full flex justify-center opacity-90">
                                    <RadarChart data={radarData} />
                                </div>
                                <div className="text-center mt-2">
                                    <span className={`text-3xl font-extrabold ${rankColor(computedRank)} drop-shadow-md`}>
                                        {computedRank}
                                    </span>
                                    <span className="text-slate-400 text-sm ml-1">Rank</span>
                                    {singing.overall_score !== undefined && (
                                        <p className="text-xs text-slate-500 mt-1">{Math.round(singing.overall_score)}点</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-[250px] flex items-center justify-center bg-slate-800/30 rounded-lg border border-slate-700/30">
                                <div className="text-slate-500 text-sm text-center">
                                    歌唱力データなし
                                </div>
                            </div>
                        )}
                    </div>

                    {/* おすすめの曲 */}
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-6">
                        <h2 className="text-lg font-bold text-white mb-4">おすすめの曲</h2>
                        {songs.length > 0 ? (
                            <div className="space-y-3">
                                {songs.slice(0, 8).map((song: any, index: number) => (
                                    <div key={song.id || index} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-700/50">
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-200 text-sm truncate">{song.title}</div>
                                                <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {song.recommended_key !== undefined && keyBadge(song.recommended_key, song.fit)}
                                            {song.match_score !== undefined && difficultyBadge(song.match_score)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm text-center py-4">おすすめ曲データなし</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultPage;