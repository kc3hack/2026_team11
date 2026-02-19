import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, ChartBarIcon } from '@heroicons/react/24/solid';

const steps = [
    {
        icon: MicrophoneIcon,
        color: "bg-blue-100 text-blue-600",
        title: "1. 声を録音する",
        desc: "トップ画面から録音方法を選びます。",
        details: [
            "「マイクで録音」→ アカペラで歌うか声を出す（5〜15秒推奨）",
            "「カラオケで録音」→ カラオケBGMありで録音（BGMは自動除去）",
            "「カラオケ音源アップロード」→ 歌入りWAVファイルを選択",
        ],
    },
    {
        icon: ChartBarIcon,
        color: "bg-violet-100 text-violet-600",
        title: "2. 解析結果を見る",
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
        color: "bg-emerald-100 text-emerald-600",
        title: "3. おすすめ曲 & キー設定",
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
        <div className="min-h-[calc(100vh-80px)] bg-transparent p-6 sm:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">使い方ガイド</h1>
                    <p className="text-slate-400 text-sm">声を録音して、あなたにぴったりの曲を見つけましょう</p>
                </div>

                {/* Steps */}
                <div className="space-y-6 mb-10">
                    {steps.map((step, i) => (
                        <div key={i} className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${step.color} bg-opacity-20 flex-shrink-0`}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-slate-200 mb-1">{step.title}</h2>
                                    <p className="text-sm text-slate-400 mb-3">{step.desc}</p>
                                    <ul className="space-y-1.5">
                                        {step.details.map((d, j) => (
                                            <li key={j} className="flex items-start gap-2 text-sm text-slate-400">
                                                <span className="text-slate-600 mt-0.5">•</span>
                                                <span>{d}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tips */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-white/5 shadow-lg">
                    <h3 className="text-sm font-bold text-slate-300 mb-4">ヒント</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
                                <span className="text-lg leading-none grayscale opacity-80">{tip.emoji}</span>
                                <span>{tip.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Key Change Legend */}
                <div className="mt-6 bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">キーおすすめの見方</h3>
                    <div className="space-y-2 text-sm text-slate-400">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-12 h-6 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 text-xs font-bold">±0</span>
                            <span>原曲キーであなたの音域にぴったり</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-12 h-6 rounded-full bg-sky-900/40 text-sky-400 border border-sky-500/30 text-xs font-bold">-2</span>
                            <span>キーを2つ下げると歌いやすい</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-12 h-6 rounded-full bg-amber-900/40 text-amber-400 border border-amber-500/30 text-xs font-bold">+3</span>
                            <span>キーを3つ上げると歌いやすい</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;