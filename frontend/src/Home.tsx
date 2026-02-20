import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, CloudArrowUpIcon, ClockIcon } from '@heroicons/react/24/solid';

interface Props {
    onNormalClick: () => void;
    onKaraokeClick: () => void;
    onUploadClick: () => void;
    onHistoryClick?: () => void;
}

const Home: React.FC<Props> = ({ onNormalClick, onKaraokeClick, onUploadClick, onHistoryClick }) => {
    return (
        <div className="min-h-[100dvh] relative bg-slate-950 overflow-hidden">

            {/* Cyberpunk Background Grid & Scanlines */}
            <div className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `
                         linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px)
                     `,
                    backgroundSize: '40px 40px',
                    backgroundPosition: 'center center'
                }}
            ></div>
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)' }}
            ></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            {/* Main Content Container */}
            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center min-h-[calc(100vh-80px)] py-12">

                {/* Header Title Area */}
                <div className="mb-12 text-center md:text-left md:ml-12">
                    <h1 className="text-6xl md:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-wide">
                        RECORD
                    </h1>
                </div>

                {/* Grid Layout for Menu Items */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-6xl mx-auto">

                    {/* Main Action: Normal Recording (Huge) */}
                    <button
                        onClick={onNormalClick}
                        className="group relative col-span-1 md:col-span-6 row-span-2 h-64 md:h-auto bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-cyan-900/40 to-slate-900/80 border-4 border-cyan-400 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(6,182,212,0.6)] hover:shadow-[0px_0px_40px_rgba(6,182,212,1)] hover:border-cyan-300 hover:scale-[1.02] overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                        {/* Light Leak */}
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-cyan-400/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-cyan-400/40 transition-all duration-500"></div>
                        <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23fff' fill-opacity='0.15'/%3E%3C/svg%3E\")", backgroundSize: '6px 6px' }}></div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
                            <MicrophoneIcon className="w-24 h-24 md:w-32 md:h-32 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] group-hover:drop-shadow-[0_0_25px_rgba(6,182,212,1)] animate-pulse" />
                            <h2 className="text-3xl md:text-5xl font-black italic text-white mt-4 tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,1)]">
                                Start<br />Recording
                            </h2>
                        </div>
                    </button>

                    {/* Secondary Action: Karaoke (Medium) */}
                    <button
                        onClick={onKaraokeClick}
                        className="group relative col-span-1 md:col-span-6 h-40 bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-pink-900/40 to-slate-900/80 border-4 border-pink-500 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(236,72,153,0.6)] hover:shadow-[0px_0px_40px_rgba(236,72,153,1)] hover:border-pink-400 hover:scale-[1.02] overflow-hidden"
                    >
                        {/* Light Leak */}
                        <div className="absolute -bottom-1/2 -right-1/2 w-64 h-64 bg-pink-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-pink-500/40 transition-all duration-500"></div>
                        <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23fff' fill-opacity='0.15'/%3E%3C/svg%3E\")", backgroundSize: '6px 6px' }}></div>

                        <div className="absolute inset-0 flex items-center justify-between px-8 z-10">
                            <div className="text-left">
                                <h2 className="text-2xl md:text-3xl font-black italic text-white tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(236,72,153,1)]">
                                    Karaoke<br />Mode
                                </h2>
                            </div>
                            <MusicalNoteIcon className="w-16 h-16 text-pink-500 group-hover:text-pink-400 transition-colors duration-300 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] group-hover:drop-shadow-[0_0_25px_rgba(236,72,153,1)]" />
                        </div>
                    </button>

                    {/* Tertiary Action: Upload (Small) */}
                    <button
                        onClick={onUploadClick}
                        className="group relative col-span-1 md:col-span-3 h-40 bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-yellow-900/40 to-slate-900/80 border-4 border-yellow-400 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(250,204,21,0.6)] hover:shadow-[0px_0px_30px_rgba(250,204,21,1)] hover:border-yellow-300 hover:scale-[1.02] overflow-hidden"
                    >
                        {/* Light Leak */}
                        <div className="absolute -top-1/4 -right-1/4 w-32 h-32 bg-yellow-400/20 blur-[40px] rounded-full pointer-events-none group-hover:bg-yellow-400/40 transition-all duration-500"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
                            <CloudArrowUpIcon className="w-10 h-10 text-yellow-400 group-hover:text-yellow-300 mb-2 transition-colors duration-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(250,204,21,1)]" />
                            <h2 className="text-xl font-bold italic text-white tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] group-hover:drop-shadow-[0_0_15px_rgba(250,204,21,1)]">
                                Upload
                            </h2>
                        </div>
                    </button>

                    {/* Quaternary Action: History (Small) */}
                    <button
                        onClick={onHistoryClick}
                        className="group relative col-span-1 md:col-span-3 h-40 bg-slate-900/80 backdrop-blur-md bg-gradient-to-br from-emerald-900/40 to-slate-900/80 border-4 border-emerald-400 transform -skew-x-3 hover:skew-x-0 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.6)] hover:shadow-[0px_0px_30px_rgba(52,211,153,1)] hover:border-emerald-300 hover:scale-[1.02] overflow-hidden"
                    >
                        {/* Light Leak */}
                        <div className="absolute -bottom-1/4 -left-1/4 w-32 h-32 bg-emerald-400/20 blur-[40px] rounded-full pointer-events-none group-hover:bg-emerald-400/40 transition-all duration-500"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
                            <ClockIcon className="w-10 h-10 text-emerald-400 group-hover:text-emerald-300 mb-2 transition-colors duration-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(52,211,153,1)]" />
                            <h2 className="text-xl font-bold italic text-white tracking-tighter uppercase transform -skew-x-6 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] group-hover:drop-shadow-[0_0_15px_rgba(52,211,153,1)]">
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
