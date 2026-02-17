import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';

// Propsの定義を追加
interface Props {
    onNormalClick: () => void;
    onKaraokeClick: () => void;
    onUploadClick: () => void;
    onAnalysisClick: () => void; // New Prop
}

const RecordingSelectionPage: React.FC<Props> = ({ onNormalClick, onKaraokeClick, onUploadClick, onAnalysisClick }) => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    {/* Logo (Dummy) */}
                    <div className="w-10 h-10 bg-blue-600 flex items-center justify-center text-white text-xs rounded-lg shadow-md">
                        logo
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800">アプリ名</h1>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-500">
                    <button type="button" className="hover:text-blue-600 transition-colors bg-transparent border-0 cursor-pointer">使い方ガイド</button>
                    <button type="button" className="text-blue-600 font-bold transition-colors bg-transparent border-0 cursor-pointer">録音</button>
                    <button type="button" onClick={onAnalysisClick} className="hover:text-blue-600 transition-colors bg-transparent border-0 cursor-pointer">分析結果</button>
                    <button type="button" className="hover:text-blue-600 transition-colors bg-transparent border-0 cursor-pointer">履歴</button>
                </nav>

                <div className="flex items-center gap-6">
                    {/* Search Bar */}
                    <div className="relative hidden lg:block">
                        <input
                            type="text"
                            placeholder="サイト内楽曲検索"
                            className="bg-slate-100 text-sm rounded-full px-5 py-2.5 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all placeholder-slate-400 text-slate-700"
                        />
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium hidden sm:block text-slate-600">ユーザー名</span>
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-xs shadow-sm border border-white">
                            icon
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Area */}
            <main className="flex flex-col md:flex-row items-center justify-center min-h-[calc(100vh-80px)] p-8 gap-8 xl:gap-12">

                {/* Normal Mode Card */}
                <button
                    type="button"
                    onClick={onNormalClick} // ハンドラを適用
                    className="group relative w-full max-w-sm h-[28rem] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col items-center justify-center border border-slate-100 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <div className="z-10 flex flex-col items-center justify-center space-y-8 p-8 text-center w-full h-full">
                        <div className="p-6 bg-blue-100 rounded-full text-blue-600 mb-2 group-hover:scale-110 transition-transform duration-300">
                            <MicrophoneIcon className="w-16 h-16" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-800">マイクで録音</h2>
                            <p className="text-sm text-slate-500 font-medium">通常のレコーディングモード</p>
                        </div>
                    </div>
                </button>

                {/* Karaoke Mode Card */}
                <button
                    type="button"
                    onClick={onKaraokeClick} // ハンドラを適用
                    className="group relative w-full max-w-sm h-[28rem] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col items-center justify-center border border-slate-100 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <div className="z-10 flex flex-col items-center justify-center space-y-8 p-8 text-center w-full h-full">
                        <div className="p-6 bg-indigo-100 rounded-full text-indigo-600 mb-2 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center gap-1 relative">
                            <MusicalNoteIcon className="w-12 h-12 z-10" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-800">カラオケで録音</h2>
                            <p className="text-sm text-slate-500 font-medium">(BGMを除去して解析)</p>
                        </div>
                    </div>
                </button>

                {/* Upload Mode Card */}
                <button
                    type="button"
                    onClick={onUploadClick} // ハンドラを適用
                    className="group relative w-full max-w-sm h-[28rem] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col items-center justify-center border border-slate-100 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <div className="z-10 flex flex-col items-center justify-center space-y-8 p-8 text-center w-full h-full">
                        <div className="p-6 bg-emerald-100 rounded-full text-emerald-600 mb-2 group-hover:scale-110 transition-transform duration-300">
                            <CloudArrowUpIcon className="w-16 h-16" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-800">カラオケ音源<br />アップロード</h2>
                            <p className="text-sm text-slate-500 font-medium">ファイルを選択して解析</p>
                        </div>
                    </div>
                </button>

            </main>
        </div>
    );
};

export default RecordingSelectionPage;