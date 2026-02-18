import React, { useState } from "react";
import RecordingSelectionPage from "./RecordingSelectionPage";
import Recorder from "./components/Recorder";
import KaraokeUploader from "./components/KaraokeUploader";
import ResultView from "./components/ResultView";
import AnalysisResultPage from "./AnalysisResultPage";
import Header from "./components/Header";

import SongListPage from "./SongListPage";
import PlaceholderPage from "./PlaceholderPage";
import BottomNav from "./components/BottomNav";

// 画面の状態を定義
type ViewState = "menu" | "recorder" | "uploader" | "result" | "analysis" | "songList" | "history" | "mypage";

export default function App() {
  const [view, setView] = useState<ViewState>("menu");
  const [isKaraokeMode, setIsKaraokeMode] = useState(false); // Recorderに渡すモード
  const [result, setResult] = useState<any>(null); // 解析結果
  const [searchQuery, setSearchQuery] = useState(""); // 検索クエリ

  // --- イベントハンドラ ---

  // マイク録音（通常）へ
  const handleNormalRecording = () => {
    setIsKaraokeMode(false);
    setView("recorder");
  };

  // マイク録音（カラオケモード）へ
  const handleKaraokeRecording = () => {
    setIsKaraokeMode(true);
    setView("recorder");
  };

  // ファイルアップロード画面へ
  const handleUpload = () => {
    setView("uploader");
  };

  // 分析結果画面へ (New)
  const handleAnalysis = () => {
    setView("analysis");
  };

  // 楽曲一覧画面へ (New)
  const handleSongList = () => {
    setView("songList");
  };

  // 解析完了時（結果画面へ）
  const handleResult = (data: any) => {
    setResult(data);
    setView("result");
  };

  // 戻るボタン（メニューへ）
  const handleBackToMenu = () => {
    setResult(null);
    setView("menu");
  };

  return (
    <div className="pb-24 md:pb-0 min-h-screen relative">
      <Header
        onMenuClick={handleBackToMenu}
        onAnalysisClick={handleAnalysis}
        onSongListClick={handleSongList}
        currentView={view}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
              {isKaraokeMode ? "🎤 カラオケで録音 (BGM除去)" : "🎙️ マイクで録音"}
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
            {/* Note: KaraokeUploader内で結果表示まで行う実装になっている場合はそのままでOKですが、
                ResultViewを共通化したい場合はKaraokeUploaderにもonResultを追加する必要があります。
                今回は元の実装を尊重してそのまま表示します。 */}
          </div>
        </div>
      )}

      {/* 結果表示画面 (ResultView) - 既存 */}
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

      {/* 分析結果画面 (AnalysisResultPage) - 新規 */}
      {view === "analysis" && (
        <div className="min-h-screen bg-slate-50">
          <AnalysisResultPage />
        </div>
      )}

      {/* 楽曲一覧画面 (SongListPage) - 新規 */}
      {view === "songList" && (
        <SongListPage searchQuery={searchQuery} />
      )}

      {/* 履歴画面 (Placeholder) */}
      {view === "history" && (
        <PlaceholderPage title="履歴" />
      )}

      {/* マイページ画面 (Placeholder) */}
      {view === "mypage" && (
        <PlaceholderPage title="マイページ" />
      )}

      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav currentView={view} onViewChange={setView} />
    </div>
  );
}