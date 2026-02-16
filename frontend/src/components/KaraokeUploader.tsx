import React, { useState, useEffect, useRef } from "react";
import { analyzeKaraoke } from "../api";
import ResultView from "./ResultView";

const STEPS = [
  { progress: 10, label: "音源を読み込み中..." },
  { progress: 25, label: "ボーカル分離中..." },
  { progress: 40, label: "ボーカル分離中（もう少し）..." },
  { progress: 55, label: "ボーカル分離中（あと少し）..." },
  { progress: 70, label: "ノイズ除去中..." },
  { progress: 85, label: "音域を解析中..." },
];

const KaraokeUploader: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // フェイク進捗（実際の処理時間に合わせて段階的に進む）
  useEffect(() => {
    if (loading) {
      let stepIndex = 0;
      setProgress(STEPS[0].progress);
      setStepLabel(STEPS[0].label);

      timerRef.current = setInterval(() => {
        stepIndex++;
        if (stepIndex < STEPS.length) {
          setProgress(STEPS[stepIndex].progress);
          setStepLabel(STEPS[stepIndex].label);
        }
      }, 8000); // 8秒ごとに進捗更新
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await analyzeKaraoke(file, file.name);
      setProgress(100);
      setStepLabel("完了！");
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "解析に失敗しました。もう一度お試しください。");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h2>🎤 カラオケ音源で測定</h2>
      <p>歌入りの音源（mp3, wav, m4a）をアップロードしてください</p>
      <input
        type="file"
        accept="audio/*"
        onChange={handleUpload}
        disabled={loading}
      />

      {loading && (
        <div style={{ marginTop: 15 }}>
          <div
            style={{
              width: "100%",
              height: 24,
              background: "#e0e0e0",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: progress >= 100 ? "#4CAF50" : "#2196F3",
                borderRadius: 12,
                transition: "width 1s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              {progress}%
            </div>
          </div>
          <p style={{ color: "#666" }}>🔄 {stepLabel}</p>
        </div>
      )}

      {error && <p style={{ color: "red" }}>⚠️ {error}</p>}
      {result && <ResultView result={result} />}
    </div>
  );
};

export default KaraokeUploader;