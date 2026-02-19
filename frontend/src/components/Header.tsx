import React from 'react'; // 【修正】Reactをインポート（これがないとビルドエラーになります）
import logo from '../assets/logo.png';

interface HeaderProps {
    onLogoClick?: () => void;
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
    onLogoClick,
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
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] sticky top-0 z-50">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={onLogoClick || onMenuClick}>
                {/* Logo Image */}
                <img src={logo} alt="App Logo" className="w-10 h-10 rounded-lg shadow-lg object-cover ring-2 ring-cyan-500/50 group-hover:ring-cyan-400 transition-all" />
                <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors drop-shadow-sm">アプリ名</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
                <button
                    type="button"
                    onClick={onGuideClick}
                    className={`${currentView === 'guide' ? 'text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'hover:text-cyan-400 text-slate-400'} transition-all bg-transparent border-0 cursor-pointer`}
                >
                    使い方ガイド
                </button>
                <button
                    type="button"
                    onClick={onMenuClick}
                    className={`${currentView === 'menu' || currentView === 'recorder' || currentView === 'uploader' ? 'text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'hover:text-cyan-400 text-slate-400'} transition-all bg-transparent border-0 cursor-pointer`}
                >
                    録音
                </button>
                <button
                    type="button"
                    onClick={onAnalysisClick}
                    className={`${currentView === 'analysis' || currentView === 'result' ? 'text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'hover:text-cyan-400 text-slate-400'} transition-all bg-transparent border-0 cursor-pointer`}
                >
                    分析結果
                </button>
                <button
                    type="button"
                    onClick={onSongListClick}
                    className={`${currentView === 'songList' ? 'text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'hover:text-cyan-400 text-slate-400'} transition-all bg-transparent border-0 cursor-pointer`}
                >
                    楽曲一覧
                </button>

                <button type="button" className="hover:text-cyan-400 text-slate-400 transition-all bg-transparent border-0 cursor-pointer">履歴</button>
            </nav>

            <div className="flex items-center gap-6">
                {/* Search Bar */}
                {/* 【修正】role="search"を追加してアクセシビリティを向上 */}
                <div className="relative hidden lg:block" role="search">
                    <input
                        type="text"
                        placeholder="サイト内楽曲検索"
                        aria-label="サイト内楽曲検索"
                        value={searchQuery}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        className="bg-slate-800/80 text-sm rounded-full px-5 py-2.5 pr-9 w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-slate-800 transition-all placeholder-slate-500 text-slate-200 border border-slate-700 hover:border-slate-600"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearchChange?.("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 bg-transparent border-0 cursor-pointer p-0 leading-none"
                            aria-label="検索をクリア"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* User Profile / Login */}
                {isAuthenticated ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium hidden sm:block text-slate-300">
                            {userName || "ユーザー"}
                        </span>
                        <button
                            type="button"
                            onClick={onLogoutClick}
                            className="text-xs text-slate-400 hover:text-rose-400 transition-colors bg-transparent border-0 cursor-pointer"
                        >
                            ログアウト
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onLoginClick}
                        className="text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-full px-5 py-2 transition-colors border-0 cursor-pointer shadow-lg shadow-cyan-500/20"
                    >
                        ログイン
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
