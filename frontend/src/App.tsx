import React, { useState, useEffect } from "react";
import RecordingSelectionPage from "./RecordingSelectionPage";
import Recorder from "./components/Recorder";
import KaraokeUploader from "./components/KaraokeUploader";
import ResultView from "./components/ResultView";
import AnalysisResultPage from "./AnalysisResultPage";
import Header from "./components/Header";
import GuidePage from "./GuidePage";
import LoginPage from "./LoginPage";

import SongListPage from "./SongListPage";
import PlaceholderPage from "./PlaceholderPage";
import BottomNav from "./components/BottomNav";
import { UserRange } from "./api";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// 画面の状態を定義
type ViewState =
  | "menu"
  | "recorder"
  | "uploader"
  | "result"
  | "analysis"
  | "songList"
  | "history"
  | "mypage"
  | "guide"
  | "login";

// localStorageキー
const RANGE_STORAGE_KEY = "voiceRange";
const RESULT_STORAGE_KEY = "lastResult";

function loadSavedRange(): UserRange | null {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return null;
}

function saveRange(range: UserRange) {
  localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(range));
}

function loadSavedResult(): any | null {
  try {
    const saved = localStorage.getItem(RESULT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return null;
}

function saveResult(result: any) {
  localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
}

function AppContent() {
  const { user, isAuthenticated, loginWithGoogle, logout } = useAuth();
  const [view, setView] = useState<ViewState>("menu");
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [result, setResult] = useState<any>(loadSavedResult);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRange, setUserRange] = useState<UserRange | null>(loadSavedRange);

  // 解析結果から音域を抽出して保存
  useEffect(() => {
    if (result && !result.error && result.chest_min_hz && result.chest_max_hz) {
      const range: UserRange = {
        chest_min_hz: result.chest_min_hz,
        chest_max_hz: result.chest_max_hz,
      };
      if (result.falsetto_max_hz) {
        range.falsetto_max_hz = result.falsetto_max_hz;
      }
      setUserRange(range);
      saveRange(range);
      saveResult(result);
    }
  }, [result]);

  // --- イベントハンドラ ---

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query && view !== "songList") {
      setView("songList");
    }
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
    setSearchQuery(""); // ← 検索クリア（全曲一覧に戻る）
    setView("songList");
  };

  const handleGuide = () => {
    setView("guide");
  };

  const handleResult = (data: any) => {
    setResult(data);
    setView("result");
  };

  const handleBackToMenu = () => {
    setSearchQuery(""); // ← 検索もクリア
    setView("menu");
  };

  // 音域リセット
  const handleClearRange = () => {
    setUserRange(null);
    localStorage.removeItem(RANGE_STORAGE_KEY);
  };

  return (
    <div className="pb-24 md:pb-0 min-h-screen relative">
      <Header
        onMenuClick={handleBackToMenu}
        onAnalysisClick={handleAnalysis}
        onSongListClick={handleSongList}
        onGuideClick={handleGuide}
        currentView={view}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        isAuthenticated={isAuthenticated}
        userName={user?.user_metadata?.full_name || user?.email || null}
        onLoginClick={() => setView("login")}
        onLogoutClick={logout}
      />

      {/* メニュー画面 */}
      {view === "menu" && (
        <RecordingSelectionPage
          onNormalClick={handleNormalRecording}
          onKaraokeClick={handleKaraokeRecording}
          onUploadClick={handleUpload}
        />
      )}

      {/* 録音画面 (Recorder) */}
      {view === "recorder" && (
        <div className="min-h-screen bg-slate-50 p-8">
          <button
            onClick={handleBackToMenu}
            className="mb-6 text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 transition-colors"
          >
            ← メニューに戻る
          </button>

          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
              {isKaraokeMode
                ? "🎤 カラオケで録音 (BGM除去)"
                : "🎙️ マイクで録音"}
            </h2>
            <Recorder
              onResult={handleResult}
              initialUseDemucs={isKaraokeMode}
            />
          </div>
        </div>
      )}

      {/* アップロード画面 (KaraokeUploader) */}
      {view === "uploader" && (
        <div className="min-h-screen bg-slate-50 p-8">
          <button
            onClick={handleBackToMenu}
            className="mb-6 text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 transition-colors"
          >
            ← メニューに戻る
          </button>

          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
            <KaraokeUploader />
          </div>
        </div>
      )}

      {/* 結果表示画面 (ResultView) */}
      {view === "result" && (
        <div className="min-h-screen bg-slate-50 p-8">
          <button
            onClick={handleBackToMenu}
            className="mb-6 text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 transition-colors"
          >
            ← トップへ戻る
          </button>

          <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
            <ResultView result={result} />
          </div>
        </div>
      )}

      {/* 分析結果画面 (AnalysisResultPage) */}
      {view === "analysis" && (
        <div className="min-h-screen bg-slate-50">
          <AnalysisResultPage result={result} />
        </div>
      )}

      {/* 楽曲一覧画面 (SongListPage) */}
      {view === "songList" && (
        <SongListPage searchQuery={searchQuery} userRange={userRange} />
      )}

      {/* 使い方ガイド */}
      {view === "guide" && <GuidePage />}

      {/* 履歴画面 (Placeholder) */}
      {view === "history" && <PlaceholderPage title="履歴" />}

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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
