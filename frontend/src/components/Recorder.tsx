import { useState, useRef } from "react";
import { analyzeVoice } from "../api";

type Props = {
  onResult: (data: any) => void;
};

export default function Recorder({ onResult }: Props) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setLoading(true);
      try {
        const result = await analyzeVoice(blob);
        onResult(result);
      } catch (err) {
        console.error(err);
        onResult({ error: "解析に失敗しました" });
      } finally {
        setLoading(false);
      }
    };

    recorder.start();
    mediaRef.current = recorder;
    setRecording(true);
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      {loading ? (
        <p>🔄 解析中...</p>
      ) : (
        <button
          onClick={recording ? stop : start}
          style={{
            fontSize: "1.5rem",
            padding: "1rem 3rem",
            borderRadius: "50px",
            border: "none",
            color: "#fff",
            background: recording ? "#e74c3c" : "#3498db",
            cursor: "pointer",
          }}
        >
          {recording ? "⏹ 録音停止" : "🎤 録音開始"}
        </button>
      )}
      {recording && (
        <p style={{ marginTop: "1rem", color: "#e74c3c" }}>
          🔴 録音中... 低い声から高い声まで出してください
        </p>
      )}
    </div>
  );
}