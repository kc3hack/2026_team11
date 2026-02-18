import React, { useState, useEffect, useRef } from "react";
import { analyzeKaraoke } from "../api";
import ResultView from "./ResultView";

const STEPS = [
  { progress: 10, label: "⚡ 音源を読み込み中..." },
  { progress: 35, label: "🎤 超高速ボーカル分離中..." },
  { progress: 60, label: "🎵 もう少しで完了..." },
  { progress: 85, label: "📊 音域を解析中..." },
];

const KaraokeUploader: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      }, 8000);
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

    // WAVファイルかどうかチェック
    const isWav =
      file.name.toLowerCase().endsWith(".wav") ||
      file.type === "audio/wav" ||
      file.type === "audio/x-wav";

    if (!isWav) {
      setError("WAVファイルのみ対応しています。音源をWAV形式に変換してからアップロードしてください。");
      // inputをリセット
      e.target.value = "";
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await analyzeKaraoke(file, file.name);
      setProgress(100);
      setStepLabel("完了！");
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      // タイムアウトエラーの特別処理
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        setError(
          "⏱️ 処理時間が5分を超えたため、タイムアウトしました。音源が長すぎるか、サーバーの負荷が高い可能性があります。もう一度お試しください。"
        );
      } else {
        setError(
          err?.response?.data?.error ||
          "解析に失敗しました。もう一度お試しください。"
        );
      }
    } finally {
      setTimeout(() => setLoading(false), 500);
      // inputをリセット（同じファイルを再アップロードできるように）
      e.target.value = "";
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h2>🎤 カラオケ音源で測定</h2>
      <p>歌入りのWAV音源をアップロードしてください（WAVのみ対応）</p>
      <p style={{ color: "#666", fontSize: "0.9em", marginTop: 5 }}>
        ⚡ 超高速モード: 処理には30秒〜2分程度かかります
      </p>
      <input
        type="file"
        accept=".wav,audio/wav,audio/x-wav"
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
