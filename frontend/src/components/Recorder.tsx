import React, { useState, useRef, useEffect } from "react";
import { analyzeVoice, analyzeKaraoke } from "../api";

interface Props {
  onResult: (data: any) => void;
  initialUseDemucs?: boolean; // 追加
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
  const [useDemucs, setUseDemucs] = useState(initialUseDemucs); // 初期値を適用
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // propsが変わった場合にstateを更新
  useEffect(() => {
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
      alert("マイクの使用が許可されていません。");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-6">
        <label className="flex items-center cursor-pointer gap-2 p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
          <input
            type="checkbox"
            checked={useDemucs}
            onChange={(e) => setUseDemucs(e.target.checked)}
            disabled={recording || loading}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-slate-700 font-medium">🎵 カラオケ中（BGMを除去して解析）</span>
        </label>
      </div>

      {!recording ? (
        <button
          onClick={startRecording}
          disabled={loading}
          className="px-10 py-5 text-xl bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
        >
           🎙️ 録音スタート
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="px-10 py-5 text-xl bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105 animate-pulse flex items-center gap-3"
        >
          ⏹️ 録音ストップ
        </button>
      )}

      {loading && (
        <div className="mt-8 w-full max-w-md">
          <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full flex items-center justify-center text-xs text-white font-bold transition-all duration-1000 ease-out ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
          <p className="text-center text-slate-500 font-medium animate-pulse">🔄 {stepLabel}</p>
        </div>
      )}
    </div>
  );
};

export default Recorder;