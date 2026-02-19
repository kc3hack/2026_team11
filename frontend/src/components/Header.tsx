import React from 'react'; // 【修正】Reactをインポート（これがないとビルドエラーになります）
import logo from '../assets/logo.png';

interface HeaderProps {
    onMenuClick: () => void;
    onAnalysisClick: () => void;
    onSongListClick: () => void;
    onGuideClick: () => void;
    currentView: string;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    isAuthenticated?: boolean;
    userName?: string | null;
    onLoginClick?: () => void;
    onLogoutClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    onMenuClick,
    onAnalysisClick,
    onSongListClick,
    onGuideClick,
    currentView,
    searchQuery = "",
    onSearchChange,
    isAuthenticated = false,
    userName = null,
    onLoginClick,
    onLogoutClick
}) => {
    return (
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-4 cursor-pointer" onClick={onMenuClick}>
                {/* Logo Image */}
                <img src={logo} alt="App Logo" className="w-10 h-10 rounded-lg shadow-md object-cover" />
                <h1 className="text-xl font-bold tracking-tight text-slate-800">アプリ名</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-500">
                <button
                    type="button"
                    onClick={onGuideClick}
                    className={`${currentView === 'guide' ? 'text-blue-600 font-bold' : 'hover:text-blue-600 text-slate-500'} transition-colors bg-transparent border-0 cursor-pointer`}
                >
                    使い方ガイド
                </button>
                <button
                    type="button"
                    onClick={onMenuClick}
                    className={`${currentView === 'menu' || currentView === 'recorder' || currentView === 'uploader' ? 'text-blue-600 font-bold' : 'hover:text-blue-600 text-slate-500'} transition-colors bg-transparent border-0 cursor-pointer`}
                >
                    録音
                </button>
                <button
                    type="button"
                    onClick={onAnalysisClick}
                    className={`${currentView === 'analysis' || currentView === 'result' ? 'text-blue-600 font-bold' : 'hover:text-blue-600 text-slate-500'} transition-colors bg-transparent border-0 cursor-pointer`}
                >
                    分析結果
                </button>
                <button
                    type="button"
                    onClick={onSongListClick}
                    className={`${currentView === 'songList' ? 'text-blue-600 font-bold' : 'hover:text-blue-600 text-slate-500'} transition-colors bg-transparent border-0 cursor-pointer`}
                >
                    楽曲一覧
                </button>

                <button type="button" className="hover:text-blue-600 transition-colors bg-transparent border-0 cursor-pointer">履歴</button>
            </nav>

            <div className="flex items-center gap-6">
                {/* Search Bar */}
                {/* 【修正】role="search"を追加してアクセシビリティを向上 */}
                <div className="relative hidden lg:block" role="search">
                    <input
                        type="text"
                        placeholder="サイト内楽曲検索"
                        aria-label="サイト内楽曲検索" /* 【修正】ラベルを追加 */
                        value={searchQuery}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        className="bg-slate-100 text-sm rounded-full px-5 py-2.5 pr-9 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all placeholder-slate-400 text-slate-700"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearchChange?.("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0 leading-none"
                            aria-label="検索をクリア"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* User Profile / Login */}
                {isAuthenticated ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium hidden sm:block text-slate-600">
                            {userName || "ユーザー"}
                        </span>
                        <button
                            type="button"
                            onClick={onLogoutClick}
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors bg-transparent border-0 cursor-pointer"
                        >
                            ログアウト
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onLoginClick}
                        className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full px-5 py-2 transition-colors border-0 cursor-pointer"
                    >
                        ログイン
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;