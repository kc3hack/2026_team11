import { useState } from "react";
import Recorder from "./components/Recorder";
import ResultView from "./components/ResultView";

export default function App() {
  const [result, setResult] = useState<any>(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f23",
      color: "#e0e0e0",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "2rem",
    }}>
      <h1 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        🎤 VoiceMatch
      </h1>
      <p style={{ textAlign: "center", color: "#888", marginBottom: "2rem" }}>
        声を出すだけで、あなたの音域がわかる
      </p>

      <Recorder onResult={setResult} />

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <ResultView result={result} />

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              onClick={() => setResult(null)}
              style={{
                padding: "0.8rem 2rem",
                borderRadius: "50px",
                border: "1px solid #444",
                background: "transparent",
                color: "#888",
                cursor: "pointer",
              }}
            >
              もう一度測定する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}