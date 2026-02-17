import React from 'react';

// Propsの型定義
interface Props {
    onSelectNormal: () => void;
    onSelectKaraoke: () => void;
    onSelectUpload: () => void;
}

const RecordingSelectionPage: React.FC<Props> = ({ onSelectNormal, onSelectKaraoke, onSelectUpload }) => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-800">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    {/* Logo (Dummy) */}
                    <div className="w-10 h-10 bg-gray-500 flex items-center justify-center text-white text-xs rounded">
                        logo
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">アプリ名</h1>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
                    <a href="#" className="hover:text-gray-900 transition-colors">使い方ガイド</a>
                    {/* 録音ボタンはアクティブ表示 */}
                    <span className="text-gray-900 font-bold border-b-2 border-gray-900 cursor-default">録音</span>
                    {/* アップロード機能へのリンクを追加 */}
                    <button onClick={onSelectUpload} className="hover:text-gray-900 transition-colors text-left">
                        ファイル解析
                    </button>
                    <a href="#" className="hover:text-gray-900 transition-colors">履歴</a>
                </nav>

                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative hidden lg:block">
                        <input
                            type="text"
                            placeholder="サイト内楽曲検索"
                            className="bg-gray-200 text-sm rounded-full px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder-gray-500"
                        />
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium hidden sm:block">ユーザー名</span>
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">
                            icon
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Area */}
            <main className="flex flex-col md:flex-row items-center justify-center min-h-[calc(100vh-80px)] p-6 gap-8">

                {/* Normal Mode Card (マイクで録音) */}
                <div 
                    onClick={onSelectNormal}
                    className="group relative w-full max-w-md h-96 bg-gray-50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col items-center justify-center border border-gray-200 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="z-10 text-center p-6 space-y-8">
                        <h2 className="text-2xl font-bold text-gray-800">マイクで録音</h2>
                        <button className="px-8 py-3 bg-gray-700 text-white rounded-full font-medium shadow-md hover:bg-gray-600 transition w-full md:w-auto">
                            録音開始
                        </button>
                    </div>
                </div>

                {/* Karaoke Mode Card (カラオケで録音 - BGM除去) */}
                <div 
                    onClick={onSelectKaraoke}
                    className="group relative w-full max-w-md h-96 bg-gray-50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col items-center justify-center border border-gray-200 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="z-10 text-center p-6 space-y-8">
                        <h2 className="text-2xl font-bold text-gray-800">
                            カラオケで録音<br />
                            <span className="text-lg font-normal text-gray-600 mt-2 block">(BGMを除去して解析)</span>
                        </h2>
                        <button className="px-8 py-3 bg-gray-700 text-white rounded-full font-medium shadow-md hover:bg-gray-600 transition w-full md:w-auto">
                            録音開始
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default RecordingSelectionPage;