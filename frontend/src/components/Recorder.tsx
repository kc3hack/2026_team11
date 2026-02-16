import React, { useState, useRef, useEffect } from "react";
import { analyzeVoice, analyzeKaraoke } from "../api";

interface Props {
  onResult: (data: any) => void;
}

const STEPS = [
  { progress: 15, label: "ボーカル分離中..." },
  { progress: 35, label: "ボーカル分離中（もう少し）..." },
  { progress: 55, label: "ボーカル分離中（あと少し）..." },
  { progress: 75, label: "ノイズ除去中..." },
  { progress: 90, label: "音域を解析中..." },
];

const Recorder: React.FC<Props> = ({ onResult }) => {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useDemucs, setUseDemucs] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading && useDemucs) {
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
    } else if (loading && !useDemucs) {
      setProgress(50);
      setStepLabel("解析中...");
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, useDemucs]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    chunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => {
      chunks.current.push(e.data);
    };

    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      setLoading(true);
      setProgress(0);

      try {
        let data;
        if (useDemucs) {
          data = await analyzeKaraoke(blob, "recording.webm");
        } else {
          data = await analyzeVoice(blob);
        }
        setProgress(100);
        setStepLabel("完了！");
        onResult(data);
      } catch (err) {
        onResult({ error: "解析に失敗しました。もう一度お試しください。" });
      } finally {
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
          setStepLabel("");
        }, 500);
      }

      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 15 }}>
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={useDemucs}
            onChange={(e) => setUseDemucs(e.target.checked)}
            disabled={recording || loading}
          />
          🎵 カラオケ中（BGMを除去して解析する）
        </label>
      </div>

      {!recording ? (
        <button
          onClick={startRecording}
          disabled={loading}
          style={{
            padding: "15px 30px",
            fontSize: 18,
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          🎙️ 録音スタート
        </button>
      ) : (
        <button
          onClick={stopRecording}
          style={{
            padding: "15px 30px",
            fontSize: 18,
            background: "#f44336",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          ⏹️ 録音ストップ
        </button>
      )}

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
    </div>
  );
};

export default Recorder;