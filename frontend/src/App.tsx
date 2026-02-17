import React, { useState } from "react";
import RecordingSelectionPage from "./RecordingSelectionPage";
import Recorder from "./components/Recorder";
import KaraokeUploader from "./components/KaraokeUploader";
import ResultView from "./components/ResultView";

type ViewState = "menu" | "recorder" | "uploader" | "result";

export default function App() {
  const [view, setView] = useState<ViewState>("menu");
  const [recorderMode, setRecorderMode] = useState<{ useDemucs: boolean }>({ useDemucs: false });
  const [result, setResult] = useState<any>(null);

  // メニューからの操作ハンドラ
  const handleSelectNormalRecord = () => {
    setRecorderMode({ useDemucs: false });
    setView("recorder");
  };

  const handleSelectKaraokeRecord = () => {
    setRecorderMode({ useDemucs: true });
    setView("recorder");
  };

  const handleSelectUpload = () => {
    setView("uploader");
  };

  // 解析完了時のハンドラ
  const handleResult = (data: any) => {
    setResult(data);
    setView("result");
  };

  // 「戻る」操作
  const handleBack = () => {
    setResult(null);
    setView("menu");
  };

  return (
    <div>
      {/* メニュー画面 */}
      {view === "menu" && (
        <RecordingSelectionPage
          onSelectNormal={handleSelectNormalRecord}
          onSelectKaraoke={handleSelectKaraokeRecord}
          onSelectUpload={handleSelectUpload}
        />
      )}

      {/* 録音画面 (Recorder) */}
      {view === "recorder" && (
        <div className="container mx-auto p-6">
          <button onClick={handleBack} className="mb-4 text-gray-600 hover:text-gray-900">
            ← 戻る
          </button>
          <h2 className="text-2xl font-bold mb-4">
            {recorderMode.useDemucs ? "🎤 カラオケで録音 (BGM除去)" : "🎙️ マイクで録音"}
          </h2>
          <Recorder
            onResult={handleResult}
            initialUseDemucs={recorderMode.useDemucs}
          />
        </div>
      )}

      {/* ファイルアップロード画面 (KaraokeUploader) */}
      {view === "uploader" && (
        <div className="container mx-auto p-6">
          <button onClick={handleBack} className="mb-4 text-gray-600 hover:text-gray-900">
            ← 戻る
          </button>
          <KaraokeUploader />
        </div>
      )}

      {/* 結果表示画面 (ResultView) */}
      {view === "result" && (
        <div className="container mx-auto p-6">
          <button onClick={handleBack} className="mb-4 text-gray-600 hover:text-gray-900">
            ← トップへ戻る
          </button>
          <ResultView result={result} />
        </div>
      )}
    </div>
  );
}