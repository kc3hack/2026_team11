import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, CloudArrowUpIcon, ClockIcon } from '@heroicons/react/24/solid';
import { useAnalysis } from './contexts/AnalysisContext'; // ★追加

interface Props {
    onNormalClick: () => void;
    onKaraokeClick: () => void;
    onUploadClick: () => void;
    onHistoryClick?: () => void;
}

const Home: React.FC<Props> = ({ onNormalClick, onKaraokeClick, onUploadClick, onHistoryClick }) => {
    // ★追加: Contextから解析中かどうかを取得
    const { isAnalyzing } = useAnalysis();

    return (
        <div className="min-h-[100dvh] relative">

            {/* Main Content Container */}
            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center min-h-[calc(100vh-80px)] py-12">

                {/* Header Title Area (Skewed) */}
                <div className="mb-8 transform -skew-x-6 text-center md:text-left md:ml-12">
                    <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white drop-shadow-[4px_4px_0px_rgba(255,0,255,1)]">
                        RECORD
                        <span className="block text-2xl md:text-3xl text-cyan-400 mt-2 font-bold tracking-widest uppercase">
                            Your World
                        </span>
                    </h1>
                </div>

                {/* ★追加: 解析中の場合はお知らせメッセージを表示 */}
                {isAnalyzing && (
                    <div className="w-full max-w-6xl mx-auto mb-8 p-4 bg-slate-800/90 border-2 border-cyan-400 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-pulse text-center backdrop-blur-sm z-20">
                        <span className="text-xl md:text-2xl font-bold text-cyan-400 italic tracking-wider">
                            🔄 現在、バックグラウンドで音声を解析中です...
                        </span>
                        <br />
                        <span className="text-sm md:text-base font-medium text-slate-300 mt-2 inline-block">
                            解析が完了すると自動的に結果画面へ移動します。新しく録音することはできません。
                        </span>
                    </div>
                )}

                {/* Grid Layout for Menu Items */}
                {/* ★追加: 解析中はボタン全体を半透明にしてクリック不可(pointer-events-none)にする */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-6xl mx-auto transition-all duration-300">

                    {/* Main Action: Normal Recording (Huge) */}
                    <button
                        onClick={onNormalClick}
                        disabled={isAnalyzing}
                        className="group relative col-span-1 md:col-span-6 row-span-2 h-64 md:h-auto bg-slate-800 border-4 border-cyan-400 transform -skew-x-3 hover:skew-x-0 hover:scale-[1.02] hover:bg-cyan-400 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(6,182,212,0.5)] hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.8)] overflow-hidden"
                    >
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23fff' fill-opacity='0.15'/%3E%3C/svg%3E\")", backgroundSize: '6px 6px' }}></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
                            <MicrophoneIcon className="w-24 h-24 md:w-32 md:h-32 text-cyan-400 group-hover:text-slate-900 transition-colors duration-300 animate-pulse" />
                            <h2 className="text-3xl md:text-5xl font-black italic text-white group-hover:text-slate-900 mt-4 tracking-tighter uppercase transform -skew-x-6">
                                Start<br />Recording
                            </h2>
                        </div>
                    </button>

                    {/* Secondary Action: Karaoke (Medium) */}
                    <button
                        onClick={onKaraokeClick}
                        disabled={isAnalyzing}
                        className="group relative col-span-1 md:col-span-6 h-40 bg-slate-800 border-4 border-pink-500 transform -skew-x-3 hover:skew-x-0 hover:scale-[1.02] hover:bg-pink-500 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(236,72,153,0.5)] hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.8)] overflow-hidden"
                    >
                        <div className="absolute inset-0 flex items-center justify-between px-8 z-10">
                            <div className="text-left">
                                <h2 className="text-2xl md:text-3xl font-black italic text-white group-hover:text-slate-900 tracking-tighter uppercase transform -skew-x-6">
                                    Karaoke<br />Mode
                                </h2>
                            </div>
                            <MusicalNoteIcon className="w-16 h-16 text-pink-500 group-hover:text-slate-900 transition-colors duration-300" />
                        </div>
                    </button>

                    {/* Tertiary Action: Upload (Small) */}
                    <button
                        onClick={onUploadClick}
                        disabled={isAnalyzing}
                        className="group relative col-span-1 md:col-span-3 h-40 bg-slate-800 border-4 border-yellow-400 transform -skew-x-3 hover:skew-x-0 hover:scale-[1.02] hover:bg-yellow-400 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(250,204,21,0.5)] hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.8)] overflow-hidden"
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
                            <CloudArrowUpIcon className="w-10 h-10 text-yellow-400 group-hover:text-slate-900 mb-2 transition-colors duration-300" />
                            <h2 className="text-xl font-bold italic text-white group-hover:text-slate-900 tracking-tighter uppercase transform -skew-x-6">
                                Upload
                            </h2>
                        </div>
                    </button>

                    {/* Quaternary Action: History (Small) */}
                    <button
                        onClick={onHistoryClick}
                        disabled={isAnalyzing}
                        className="group relative col-span-1 md:col-span-3 h-40 bg-slate-800 border-4 border-emerald-400 transform -skew-x-3 hover:skew-x-0 hover:scale-[1.02] hover:bg-emerald-400 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.5)] hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.8)] overflow-hidden"
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
                            <ClockIcon className="w-10 h-10 text-emerald-400 group-hover:text-slate-900 mb-2 transition-colors duration-300" />
                            <h2 className="text-xl font-bold italic text-white group-hover:text-slate-900 tracking-tighter uppercase transform -skew-x-6">
                                History
                            </h2>
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default Home;
