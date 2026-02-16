import React, { useState } from "react";
import Recorder from "./components/Recorder";
import KaraokeUploader from "./components/KaraokeUploader";
import ResultView from "./components/ResultView";
import "./App.css";

const App: React.FC = () => {
  const [mode, setMode] = useState<"mic" | "karaoke">("mic");
  const [result, setResult] = useState<any>(null);

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>🎵 音域測定アプリ</h1>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => { setMode("mic"); setResult(null); }}
          style={{
            padding: "10px 20px",
            marginRight: 10,
            background: mode === "mic" ? "#4CAF50" : "#ddd",
            color: mode === "mic" ? "white" : "black",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          🎙️ マイクで録音
        </button>
        <button
          onClick={() => { setMode("karaoke"); setResult(null); }}
          style={{
            padding: "10px 20px",
            background: mode === "karaoke" ? "#2196F3" : "#ddd",
            color: mode === "karaoke" ? "white" : "black",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          🎤 カラオケ音源
        </button>
      </div>

      {mode === "mic" ? (
        <Recorder onResult={setResult} />
      ) : (
        <KaraokeUploader />
      )}

      {result && <ResultView result={result} />}
    </div>
  );
};

export default App;