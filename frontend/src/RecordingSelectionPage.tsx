import React from 'react';
import { MicrophoneIcon, MusicalNoteIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';
import { useAnalysis } from './contexts/AnalysisContext';

// Propsの定義を追加
interface Props {
    onNormalClick: () => void;
    onKaraokeClick: () => void;
    onUploadClick: () => void;
}

const RecordingSelectionPage: React.FC<Props> = ({ onNormalClick, onKaraokeClick, onUploadClick }) => {
    // ★追加：Contextから解析中かどうかを取得
    const { isAnalyzing } = useAnalysis();

    return (
        <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-700 flex flex-col">

            {/* Main Area */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-5xl mx-auto">

                {/* ★追加：解析中の場合はお知らせメッセージを表示 */}
                {isAnalyzing && (
                    <div className="w-full max-w-3xl mb-8 p-4 bg-cyan-100/80 border-2 border-cyan-400 text-cyan-800 rounded-xl font-bold text-center shadow-md animate-pulse">
                        <span className="text-lg">🔄 現在、バックグラウンドで音声を解析中です...</span><br />
                        <span className="text-sm font-medium text-cyan-700 mt-1 inline-block">
                            解析が完了すると自動的に結果画面へ移動します。新しく録音することはできません。
                        </span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-4 md:gap-8 xl:gap-12 w-full justify-center">
                    {/* Normal Mode Card */}
                    <button
                        type="button"
                        onClick={onNormalClick}
                        disabled={isAnalyzing} // ★解析中はボタンを無効化
                        className={`group relative w-full max-w-sm flex-1 md:flex-none md:h-[28rem] bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center border border-slate-100 overflow-hidden min-h-[100px] transition-all duration-300 ${isAnalyzing
                                ? "opacity-50 cursor-not-allowed grayscale" // 解析中のスタイル
                                : "hover:shadow-2xl transform md:hover:-translate-y-2 cursor-pointer" // 通常時のスタイル
                            }`}
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
                        onClick={onKaraokeClick}
                        disabled={isAnalyzing} // ★解析中はボタンを無効化
                        className={`group relative w-full max-w-sm flex-1 md:flex-none md:h-[28rem] bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center border border-slate-100 overflow-hidden min-h-[100px] transition-all duration-300 ${isAnalyzing
                                ? "opacity-50 cursor-not-allowed grayscale"
                                : "hover:shadow-2xl transform md:hover:-translate-y-2 cursor-pointer"
                            }`}
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
                        onClick={onUploadClick}
                        disabled={isAnalyzing} // ★解析中はボタンを無効化
                        className={`group relative w-full max-w-sm flex-1 md:flex-none md:h-[28rem] bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center border border-slate-100 overflow-hidden min-h-[100px] transition-all duration-300 ${isAnalyzing
                                ? "opacity-50 cursor-not-allowed grayscale"
                                : "hover:shadow-2xl transform md:hover:-translate-y-2 cursor-pointer"
                            }`}
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
                </div>
            </main>
        </div>
    );
};

export default RecordingSelectionPage;