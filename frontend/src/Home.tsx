import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, CloudArrowUpIcon, ClockIcon } from '@heroicons/react/24/solid';
import { useAnalysis } from './contexts/AnalysisContext';

interface Props {
    onNormalClick: () => void;
    onKaraokeClick: () => void;
    onUploadClick: () => void;
    onHistoryClick?: () => void;
}

const Home: React.FC<Props> = ({ onNormalClick, onKaraokeClick, onUploadClick, onHistoryClick }) => {
    const { isAnalyzing } = useAnalysis();

    return (
        <div className="min-h-[100dvh] relative bg-transparent overflow-hidden">



            {/* Main Content Container */}
            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center min-h-[calc(100vh-80px)] py-12">

                {/* Header Title Area */}
                <div className="mb-12 text-center md:text-left md:ml-12">
                    <h1 className="text-6xl md:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-wide">
                        RECORD
                    </h1>
                </div>

                {/* Analyzing Banner */}
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-[80rem] mx-auto transition-all duration-300">

                    {/* Main Action 1: Normal Recording (Huge Left) */}
                    <button
                        onClick={onNormalClick}
                        disabled={isAnalyzing}
                        className="group relative col-span-1 md:col-span-5 row-span-2 h-64 md:h-[28rem] bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-cyan-900/40 to-slate-900/80 border-4 border-cyan-400 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(6,182,212,0.6)] hover:shadow-[0px_0px_40px_rgba(6,182,212,1)] hover:border-cyan-300 hover:scale-[1.02] overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none flex flex-col justify-center items-center"
                    >
                        {/* Light Leak */}
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-cyan-400/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-cyan-400/40 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col items-center justify-center p-8 w-full h-full">
                            <MicrophoneIcon className="w-24 h-24 md:w-32 md:h-32 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] group-hover:drop-shadow-[0_0_25px_rgba(6,182,212,1)] animate-pulse" />
                            <h2 className="text-3xl md:text-5xl lg:text-5xl font-black italic text-white mt-4 tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,1)] text-center">
                                Akapera<br />Mode
                            </h2>
                        </div>
                    </button>

                    {/* Main Action 2: Karaoke (Huge Center) */}
                    <button
                        onClick={onKaraokeClick}
                        disabled={isAnalyzing}
                        className="group relative col-span-1 md:col-span-5 row-span-2 h-64 md:h-[28rem] bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-pink-900/40 to-slate-900/80 border-4 border-pink-500 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(236,72,153,0.6)] hover:shadow-[0px_0px_40px_rgba(236,72,153,1)] hover:border-pink-400 hover:scale-[1.02] overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none flex flex-col justify-center items-center"
                    >
                        {/* Light Leak */}
                        <div className="absolute -bottom-1/2 -right-1/2 w-64 h-64 bg-pink-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-pink-500/40 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col items-center justify-center p-8 w-full h-full">
                            <MusicalNoteIcon className="w-24 h-24 md:w-32 md:h-32 text-pink-500 group-hover:text-pink-400 transition-colors duration-300 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] group-hover:drop-shadow-[0_0_25px_rgba(236,72,153,1)] animate-pulse" />
                            <h2 className="text-3xl md:text-5xl lg:text-5xl font-black italic text-white mt-4 tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(236,72,153,1)] text-center">
                                Karaoke<br />Mode
                            </h2>
                        </div>
                    </button>

                    {/* Right Column: Stacked Sub-Actions */}
                    <div className="col-span-1 md:col-span-2 row-span-2 flex flex-col gap-6 md:h-[28rem]">

                        {/* Tertiary Action: Upload (Top Half) */}
                        <button
                            onClick={onUploadClick}
                            disabled={isAnalyzing}
                            className="flex-1 group relative bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-yellow-900/40 to-slate-900/80 border-4 border-yellow-400 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(250,204,21,0.6)] hover:shadow-[0px_0px_30px_rgba(250,204,21,1)] hover:border-yellow-300 hover:scale-[1.02] overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none flex flex-col justify-center items-center py-6"
                        >
                            {/* Light Leak */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-400/20 blur-[40px] rounded-full pointer-events-none group-hover:bg-yellow-400/40 transition-all duration-500"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center p-4">
                                <CloudArrowUpIcon className="w-12 h-12 lg:w-16 lg:h-16 text-yellow-400 group-hover:text-yellow-300 mb-2 transition-colors duration-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(250,204,21,1)]" />
                                <h2 className="text-xl lg:text-2xl font-bold italic text-white tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] group-hover:drop-shadow-[0_0_15px_rgba(250,204,21,1)] text-center">
                                    Upload
                                </h2>
                            </div>
                        </button>

                        {/* Quaternary Action: History (Bottom Half) */}
                        <button
                            onClick={onHistoryClick}
                            disabled={isAnalyzing}
                            className="flex-1 group relative bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-emerald-900/40 to-slate-900/80 border-4 border-emerald-400 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.6)] hover:shadow-[0px_0px_30px_rgba(52,211,153,1)] hover:border-emerald-300 hover:scale-[1.02] overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none flex flex-col justify-center items-center py-6"
                        >
                            {/* Light Leak */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-400/20 blur-[40px] rounded-full pointer-events-none group-hover:bg-emerald-400/40 transition-all duration-500"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center p-4">
                                <ClockIcon className="w-12 h-12 lg:w-16 lg:h-16 text-emerald-400 group-hover:text-emerald-300 mb-2 transition-colors duration-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(52,211,153,1)]" />
                                <h2 className="text-xl lg:text-2xl font-bold italic text-white tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] group-hover:drop-shadow-[0_0_15px_rgba(52,211,153,1)] text-center">
                                    History
                                </h2>
                            </div>
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
