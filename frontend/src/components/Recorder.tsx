import React, { useState, useRef, useEffect } from "react";
import { analyzeVoice, analyzeKaraoke } from "../api";

interface Props {
  onResult: (data: any) => void;
  initialUseDemucs?: boolean; // 追加: 初期モード指定
}

const STEPS = [
  { progress: 15, label: "ボーカル分離中..." },
  { progress: 35, label: "ボーカル分離中（もう少し）..." },
  { progress: 55, label: "ボーカル分離中（あと少し）..." },
  { progress: 75, label: "ノイズ除去中..." },
  { progress: 90, label: "音域を解析中..." },
];

const Recorder: React.FC<Props> = ({ onResult, initialUseDemucs = false }) => {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  // 初期値をpropsから設定
  const [useDemucs, setUseDemucs] = useState(initialUseDemucs);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // propsが変わったらstateも更新（念のため）
    setUseDemucs(initialUseDemucs);
  }, [initialUseDemucs]);

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
    try {
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
    } catch (e) {
        console.error("マイクへのアクセスが拒否されました", e);
        alert("マイクの使用を許可してください");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div style={{ marginBottom: 15 }}>
        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={useDemucs}
            onChange={(e) => setUseDemucs(e.target.checked)}
            disabled={recording || loading}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-700">🎵 カラオケ中（BGMを除去して解析する）</span>
        </label>
      </div>

      {!recording ? (
        <button
          onClick={startRecording}
          disabled={loading}
          className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎙️ 録音スタート
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-lg transition-all transform hover:scale-105 animate-pulse"
        >
          ⏹️ 録音ストップ
        </button>
      )}

      {loading && (
        <div style={{ marginTop: 25, width: '100%', maxWidth: '400px' }}>
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
          <p className="text-center text-gray-600">🔄 {stepLabel}</p>
        </div>
      )}
    </div>
  );
};

export default Recorder;