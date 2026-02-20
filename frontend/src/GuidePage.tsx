import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, ChartBarIcon } from '@heroicons/react/24/solid';

const steps = [
    {
        icon: MicrophoneIcon,
        color: "text-cyan-400",
        decorationColor: "border-cyan-400",
        borderGlow: "border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] group-hover:border-cyan-400",
        textGlow: "drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]",
        title: "声を録音する",
        desc: "トップ画面から録音方法を選びます。",
        details: [
            "「マイクで録音」→ アカペラで歌うか声を出す（5〜15秒推奨）",
            "「カラオケで録音」→ カラオケBGMありで録音（BGMは自動除去）",
            "「カラオケ音源アップロード」→ 歌入りWAVファイルを選択",
        ],
    },
    {
        icon: ChartBarIcon,
        color: "text-fuchsia-400",
        decorationColor: "border-fuchsia-400",
        borderGlow: "border-fuchsia-500/50 shadow-[0_0_15px_rgba(232,121,249,0.2)] group-hover:shadow-[0_0_30px_rgba(232,121,249,0.6)] group-hover:border-fuchsia-400",
        textGlow: "drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]",
        title: "解析結果を見る",
        desc: "録音後、自動で音域解析が始まります。",
        details: [
            "あなたの音域（最低音〜最高音）",
            "地声・裏声の割合と音域",
            "声質タイプ（ハイトーン、バリトンなど）",
            "歌唱力スコア（音域・安定性・表現力）",
        ],
    },
    {
        icon: MusicalNoteIcon,
        color: "text-yellow-400",
        decorationColor: "border-yellow-400",
        borderGlow: "border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.2)] group-hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] group-hover:border-yellow-400",
        textGlow: "drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
        title: "おすすめ曲 & キー設定",
        desc: "あなたの音域に合った曲が表示されます。",
        details: [
            "おすすめ曲リスト（マッチ度付き）",
            "楽曲一覧で各曲の推奨キー変更（±0〜±7）を確認",
            "声が似ているアーティストも表示",
        ],
    },
];

const tips = [
    { emoji: "🎯", text: "静かな場所で録音すると精度が上がります" },
    { emoji: "⏱️", text: "低音〜高音まで幅広く出すと音域を正確に測定できます" },
    { emoji: "🎤", text: "カラオケ音源はWAV形式のみ対応しています" },
    { emoji: "🔑", text: "楽曲一覧のキーおすすめは、録音後に自動表示されます" },
];

const GuidePage: React.FC = () => {
    return (
        <div className="min-h-[calc(100vh-80px)] bg-transparent p-6 sm:p-8 overflow-hidden font-sans text-slate-300">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-12 text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] tracking-wide">
                        HOW TO USE
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base tracking-widest uppercase">
                        ~ 声を録音して、あなたにぴったりの曲を ~
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-12 sm:space-y-16 mb-16 relative">
                    {/* 背景の縦線（サイバー感） */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-fuchsia-500/30 to-transparent -translate-x-1/2 hidden md:block z-0"></div>

                    {steps.map((step, i) => {
                        const isEven = i % 2 !== 0;
                        return (
                            <div
                                key={i}
                                className={`group relative w-full md:w-[80%] ${isEven ? 'md:ml-auto md:mr-0 pl-0 md:pl-8' : 'md:mr-auto md:ml-0 pr-0 md:pr-8'} z-10 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] perspective-1000`}
                            >
                                <div
                                    className={`relative bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 border-2 ${step.borderGlow} transition-all duration-500 overflow-hidden`}
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}
                                >
                                    {/* Giant Watermark Number */}
                                    <div
                                        className={`absolute -bottom-10 ${isEven ? '-left-4 sm:-left-8' : '-right-4 sm:-right-8'} text-[10rem] sm:text-[14rem] font-black italic text-white opacity-10 pointer-events-none select-none leading-none z-0 mix-blend-overlay`}
                                    >
                                        {i + 1}
                                    </div>

                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
                                        <div className={`p-4 bg-slate-800/80 rounded-lg border border-slate-700/50 ${step.color} shadow-inner`}>
                                            <step.icon className="w-8 h-8 sm:w-10 sm:h-10" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className={`text-2xl sm:text-3xl font-black italic mb-2 tracking-wide ${step.color} ${step.textGlow}`}>
                                                {step.title}
                                            </h2>
                                            <p className="text-base sm:text-lg text-slate-300 mb-4 font-bold tracking-wide">{step.desc}</p>
                                            <ul className="space-y-2">
                                                {step.details.map((d, j) => (
                                                    <li key={j} className="flex items-start gap-2 text-sm sm:text-base text-slate-400">
                                                        <span className={`${step.color} mt-0.5`}>▶</span>
                                                        <span>{d}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Decoration Lines */}
                                    <div className={`absolute top-0 right-0 w-16 h-1 border-t-2 border-r-2 ${step.decorationColor} opacity-50`}></div>
                                    <div className={`absolute bottom-0 left-0 w-16 h-1 border-b-2 border-l-2 ${step.decorationColor} opacity-50`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tips & Extras */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {/* Tips */}
                    <div className="bg-slate-900/80 backdrop-blur-xl p-6 border-l-4 border-l-cyan-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] group hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300">
                        <h3 className="text-lg font-black italic text-cyan-400 mb-4 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] tracking-wide">SYSTEM TIPS</h3>
                        <div className="space-y-3">
                            {tips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm text-slate-400">
                                    <span className="text-lg leading-none opacity-80">{tip.emoji}</span>
                                    <span>{tip.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Change Legend */}
                    <div className="bg-slate-900/80 backdrop-blur-xl p-6 border-l-4 border-l-fuchsia-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] group hover:border-fuchsia-400 hover:shadow-[0_0_20px_rgba(232,121,249,0.3)] transition-all duration-300">
                        <h3 className="text-lg font-black italic text-fuchsia-400 mb-4 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)] tracking-wide">KEY SETTING LEGEND</h3>
                        <div className="space-y-4 text-sm text-slate-400">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-14 h-7 rounded-sm bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 text-xs font-black italic shadow-[0_0_5px_rgba(52,211,153,0.5)]">±0</span>
                                <span>原曲キーであなたの音域にぴったり</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-14 h-7 rounded-sm bg-sky-900/40 text-sky-400 border border-sky-500/50 text-xs font-black italic shadow-[0_0_5px_rgba(14,165,233,0.5)]">-2</span>
                                <span>キーを2つ下げると歌いやすい</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-14 h-7 rounded-sm bg-amber-900/40 text-amber-400 border border-amber-500/50 text-xs font-black italic shadow-[0_0_5px_rgba(245,158,11,0.5)]">+3</span>
                                <span>キーを3つ上げると歌いやすい</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(GuidePage);