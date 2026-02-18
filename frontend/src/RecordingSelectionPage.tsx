import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';

// Propsの定義を追加
interface Props {
    onNormalClick: () => void;
    onKaraokeClick: () => void;
    onUploadClick: () => void;
}

const RecordingSelectionPage: React.FC<Props> = ({ onNormalClick, onKaraokeClick, onUploadClick }) => {
    return (
        <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-700 flex flex-col">

            {/* Header Removed - Managed in App.tsx */}

            {/* Main Area */}
            <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 md:p-8 gap-4 md:gap-8 xl:gap-12 w-full max-w-5xl mx-auto">

                {/* Normal Mode Card */}
                <button
                    type="button"
                    onClick={onNormalClick} // ハンドラを適用
                    className="group relative w-full max-w-sm flex-1 md:flex-none md:h-[28rem] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform md:hover:-translate-y-2 cursor-pointer flex flex-col items-center justify-center border border-slate-100 overflow-hidden min-h-[100px]"
                >
                    <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <div className="z-10 flex flex-row md:flex-col items-center justify-start md:justify-center space-x-6 md:space-x-0 md:space-y-8 p-4 md:p-8 text-left md:text-center w-full h-full">
                        <div className="p-4 md:p-6 bg-blue-100 rounded-full text-blue-600 mb-0 md:mb-2 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                            <MicrophoneIcon className="w-8 h-8 md:w-16 md:h-16" />
                        </div>

                        <div className="space-y-1 md:space-y-2">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800">マイクで録音</h2>
                            <p className="text-xs md:text-sm text-slate-500 font-medium">通常のレコーディングモード</p>
                        </div>
                    </div>
                </button>

                {/* Karaoke Mode Card */}
                <button
                    type="button"
                    onClick={onKaraokeClick} // ハンドラを適用
                    className="group relative w-full max-w-sm flex-1 md:flex-none md:h-[28rem] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform md:hover:-translate-y-2 cursor-pointer flex flex-col items-center justify-center border border-slate-100 overflow-hidden min-h-[100px]"
                >
                    <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <div className="z-10 flex flex-row md:flex-col items-center justify-start md:justify-center space-x-6 md:space-x-0 md:space-y-8 p-4 md:p-8 text-left md:text-center w-full h-full">
                        <div className="p-4 md:p-6 bg-indigo-100 rounded-full text-indigo-600 mb-0 md:mb-2 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center gap-1 relative flex-shrink-0">
                            <MusicalNoteIcon className="w-6 h-6 md:w-12 md:h-12 z-10" />
                        </div>

                        <div className="space-y-1 md:space-y-2">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800">カラオケで録音</h2>
                            <p className="text-xs md:text-sm text-slate-500 font-medium">(BGMを除去して解析)</p>
                        </div>
                    </div>
                </button>

                {/* Upload Mode Card */}
                <button
                    type="button"
                    onClick={onUploadClick} // ハンドラを適用
                    className="group relative w-full max-w-sm flex-1 md:flex-none md:h-[28rem] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform md:hover:-translate-y-2 cursor-pointer flex flex-col items-center justify-center border border-slate-100 overflow-hidden min-h-[100px]"
                >
                    <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <div className="z-10 flex flex-row md:flex-col items-center justify-start md:justify-center space-x-6 md:space-x-0 md:space-y-8 p-4 md:p-8 text-left md:text-center w-full h-full">
                        <div className="p-4 md:p-6 bg-emerald-100 rounded-full text-emerald-600 mb-0 md:mb-2 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                            <CloudArrowUpIcon className="w-8 h-8 md:w-16 md:h-16" />
                        </div>

                        <div className="space-y-1 md:space-y-2">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800">カラオケ音源<br className="hidden md:block" />アップロード</h2>
                            <p className="text-xs md:text-sm text-slate-500 font-medium">ファイルを選択して解析</p>
                        </div>
                    </div>
                </button>

            </main>
        </div>
    );
};

export default RecordingSelectionPage;