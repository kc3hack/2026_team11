// frontend/src/App.tsx
import { useState, useEffect } from "react";
import Home from "./Home";
import Landing from "./Landing";
import Recorder from "./components/Recorder";
import KaraokeUploader from "./components/KaraokeUploader";
import ResultView from "./components/ResultView";
import AnalysisResultPage from "./AnalysisResultPage";
import Header from "./components/Header";
import GuidePage from "./GuidePage";
import LoginPage from "./LoginPage";
import SongListPage from "./SongListPage";
import FavoritesPage from "./FavoritesPage";
import PlaceholderPage from "./PlaceholderPage";
import BottomNav from "./components/BottomNav";
import { AnalysisResult, UserRange } from "./api";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import HistoryPage from "./HistoryPage";

// 画面の状態を定義
type ViewState =
  | "landing"
  | "menu"
  | "recorder"
  | "uploader"
  | "result"
  | "analysis"
  | "songList"
  | "favorites"
  | "history"
  | "mypage"
  | "guide"
  | "login";

// localStorageキー
const RANGE_STORAGE_KEY = "voiceRange";

function loadSavedRange(): UserRange | null {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as UserRange;
  } catch {
    /* ignore */
  }
  return null;
}

function saveRange(range: UserRange) {
  localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(range));
}

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [view, setView] = useState<ViewState>("landing");
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRange, setUserRange] = useState<UserRange | null>(loadSavedRange);
  
  // ★ 追加: 履歴画面から遷移してきたかを判定するフラグ
  const [isFromHistory, setIsFromHistory] = useState(false);

  // 解析結果から音域を抽出して保存
  useEffect(() => {
    if (
      result &&
      !result.error &&
      result.chest_min_hz &&
      result.chest_max_hz
    ) {
      const range: UserRange = {
        chest_min_hz: result.chest_min_hz,
        chest_max_hz: result.chest_max_hz,
      };
      if (result.falsetto_max_hz) {
        range.falsetto_max_hz = result.falsetto_max_hz;
      }
      setUserRange(range);
      saveRange(range);
    }
  }, [result]);

  // --- イベントハンドラ ---

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query && view !== "songList") {
      setView("songList");
    }
  };

  const handleLanding = () => {
    setView("landing");
  };

  const handleMenu = () => {
    setSearchQuery("");
    setView("menu");
  };

  const handleNormalRecording = () => {
    setIsKaraokeMode(false);
    setView("recorder");
  };

  const handleKaraokeRecording = () => {
    setIsKaraokeMode(true);
    setView("recorder");
  };

  const handleUpload = () => {
    setView("uploader");
  };

  const handleAnalysis = () => {
    setView("analysis");
  };

  const handleSongList = () => {
    setSearchQuery("");
    setView("songList");
  };

  const handleGuide = () => {
    setView("guide");
  };

  const handleHistory = () => {
    setView("history");
  };

  const handleFavorites = () => {
    setView("favorites");
  };

  const handleResult = (data: AnalysisResult) => {
    setResult(data);
    setIsFromHistory(false); // 新規録音時はフラグをオフ
    setView("result");
  };

  const handleBackToMenu = () => {
    setSearchQuery("");
    setView("menu");
  };

  // 音域リセット
  const handleClearRange = () => {
    setUserRange(null);
    localStorage.removeItem(RANGE_STORAGE_KEY);
  };

  return (
    <div className="pb-24 md:pb-0 min-h-[100dvh] relative bg-slate-900 overflow-hidden font-sans selection:bg-pink-500 selection:text-white text-slate-200">
      {/* Dynamic Background Elements (Global) */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-r from-red-600 to-transparent -skew-y-3 transform" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[40%] bg-gradient-to-l from-cyan-600 to-transparent skew-y-3 transform" />
        <div className="absolute top-[20%] right-[-20%] w-[800px] h-[800px] border-[50px] border-white/5 rounded-full" />
      </div>

      <div className="relative z-10">
        <Header
          onLogoClick={handleLanding}
          onMenuClick={handleBackToMenu}
          onAnalysisClick={handleAnalysis}
          onSongListClick={handleSongList}
          onFavoritesClick={handleFavorites}
          onGuideClick={handleGuide}
          onHistoryClick={handleHistory}
          currentView={view}
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          isAuthenticated={isAuthenticated}
          userName={user?.user_metadata?.full_name || user?.email || null}
          onLoginClick={() => setView("login")}
          onLogoutClick={logout}
        />

        {/* ランディング画面 (Landing) */}
        {view === "landing" && (
          <Landing
            onRecordClick={handleMenu}
            onHistoryClick={handleHistory}
          />
        )}

        {/* メニュー画面 (Grid Menu) */}
        {view === "menu" && (
          <Home
            onNormalClick={handleNormalRecording}
            onKaraokeClick={handleKaraokeRecording}
            onUploadClick={handleUpload}
            onHistoryClick={handleHistory}
          />
        )}

        {/* 録音画面 (Recorder) */}
        {view === "recorder" && (
          <div className="min-h-screen bg-transparent p-8">
            <button
              onClick={handleBackToMenu}
              className="mb-6 text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
            >
              ← メニューに戻る
            </button>

            <div className="max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-slate-700/50 relative overflow-hidden">
              {/* Decoration rings */}
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <h2 className="text-3xl sm:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-8 text-center drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] tracking-wider">
                {isKaraokeMode ? "🎤 KARAOKE RECORDING" : "🎙️ MIC RECORDING"}
              </h2>
              <Recorder onResult={handleResult} initialUseDemucs={isKaraokeMode} />
            </div>
          </div>
        )}

        {/* アップロード画面 (KaraokeUploader) */}
        {view === "uploader" && (
          <div className="min-h-screen bg-transparent p-8">
            <button
              onClick={handleBackToMenu}
              className="mb-6 text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
            >
              ← メニューに戻る
            </button>

            <div className="max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-slate-700/50 relative overflow-hidden">
              {/* Decoration rings */}
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <KaraokeUploader onResult={handleResult} />
            </div>
          </div>
        )}

        {/* ★ 変更: 結果表示画面 (ResultView) */}
        {view === "result" && (
          <div className="min-h-screen bg-transparent p-8">
            <button
              // 履歴から来た場合は「履歴」へ戻り、録音直後の場合は「メニュー」へ戻る
              onClick={isFromHistory ? handleHistory : handleBackToMenu}
              className="mb-6 text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
            >
              {isFromHistory ? "← 履歴に戻る" : "← トップへ戻る"}
            </button>

            <div className="max-w-3xl mx-auto bg-transparent p-0 rounded-2xl">
              {result && <ResultView result={result} />}
            </div>
          </div>
        )}

        {/* 分析結果画面 (AnalysisResultPage) */}
        {view === "analysis" && (
          <div className="min-h-screen bg-transparent">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-2">
              <button
                onClick={handleHistory}
                className="text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
              >
                ← 戻る
              </button>
            </div>
            <AnalysisResultPage result={result} />
          </div>
        )}

        {/* 楽曲一覧画面 (SongListPage) */}
        {view === "songList" && (
          <SongListPage searchQuery={searchQuery} userRange={userRange} onLoginClick={() => setView("login")} />
        )}

        {/* お気に入り画面 */}
        {view === "favorites" && (
          <FavoritesPage userRange={userRange} onLoginClick={() => setView("login")} />
        )}

        {/* 使い方ガイド */}
        {view === "guide" && <GuidePage />}

        {/* 履歴画面 (HistoryPage) */}
        {view === "history" && (
          <HistoryPage 
            onLoginClick={() => setView("login")}
            onSelectRecord={(record) => {
              if (record.result_json) {
                // DBに完全なデータが保存されている場合はそれをそのまま使う
                setResult(record.result_json);
              } else {
                // （古い履歴など、詳細データがない場合のフォールバック）
                const mockResult: AnalysisResult = {
                  overall_min: record.vocal_range_min || "-",
                  overall_max: record.vocal_range_max || "-",
                  overall_min_hz: 0,
                  overall_max_hz: 0,
                  chest_min: record.vocal_range_min || undefined,
                  chest_max: record.vocal_range_max || undefined,
                  falsetto_max: record.falsetto_max || undefined,
                };
                setResult(mockResult);
              }
              setIsFromHistory(true); // 履歴から開いたフラグを立てる
              setView("result"); // ★ analysisではなく result（元の画面）へ遷移
            }}
          />
        )}

        {/* マイページ画面 (Placeholder) */}
        {view === "mypage" && <PlaceholderPage title="マイページ" />}

        {/* ログイン画面 */}
        {view === "login" && <LoginPage />}

        {/* Bottom Navigation (Mobile Only) */}
        <BottomNav
          currentView={view}
          onViewChange={setView}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}