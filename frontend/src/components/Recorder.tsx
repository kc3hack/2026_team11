import React, { useState, useRef, useEffect, useCallback } from "react";
import { analyzeVoice, analyzeKaraoke, AnalysisResult } from "../api";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

interface Props {
  onResult: (data: AnalysisResult) => void;
  initialUseDemucs?: boolean;
}

const STEPS = [
  { progress: 20, label: "⚡ 超高速ボーカル分離中..." },
  { progress: 50, label: "🎵 ボーカル抽出中（1〜2分）..." },
  { progress: 75, label: "🎶 もうすぐ完了..." },
  { progress: 90, label: "📊 音域を解析中..." },
];

const Recorder: React.FC<Props> = ({ onResult, initialUseDemucs = false }) => {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  // initialUseDemucs はマウント時に確定するため、useEffect による同期は不要
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [noFalsetto, setNoFalsetto] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Visualizer refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Loading animation logic
  useEffect(() => {
    if (loading && initialUseDemucs) {
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
    } else if (loading && !initialUseDemucs) {
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
  }, [loading, initialUseDemucs]);

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // ビジュアライザー描画関数
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current || !dataArrayRef.current) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    ctx.fillStyle = "rgb(100, 116, 139)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const gradient = ctx.createLinearGradient(0, HEIGHT, 0, 0);
    gradient.addColorStop(0, "#38bdf8");
    gradient.addColorStop(1, "#a78bfa");
    ctx.fillStyle = gradient;

    const totalBins = dataArrayRef.current.length;
    const maxBinIndex = Math.floor(totalBins * 0.4);
    const barCount = 80;
    const barWidth = (WIDTH / barCount) * 0.8;
    const gap = (WIDTH / barCount) * 0.2;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
      const percent = i / barCount;
      const indexMapping = Math.pow(percent, 2.0);
      const rawIndex = Math.floor(indexMapping * maxBinIndex);
      const valueIndex = Math.min(rawIndex, totalBins - 1);
      const v = dataArrayRef.current[valueIndex];
      const barHeight = Math.max((v / 255) * HEIGHT * 0.95, 5);
      ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
      x += barWidth + gap;
    }

    animationIdRef.current = requestAnimationFrame(drawVisualizer);
  }, []);

  // 録音開始
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
        const blob = new Blob(chunks.current, { type: "audio/webm" });

        setLoading(true);
        setProgress(0);

        try {
          const data = initialUseDemucs
            ? await analyzeKaraoke(blob, "recording.webm", noFalsetto)
            : await analyzeVoice(blob, noFalsetto);

          setProgress(100);
          setStepLabel("完了！");
          onResult(data);
        } catch (err: unknown) {
          const axiosErr = err as { code?: string; message?: string; response?: { data?: { error?: string } } };
          let errorMsg: string;
          if (
            axiosErr?.code === "ECONNABORTED" ||
            axiosErr?.message?.includes("timeout")
          ) {
            errorMsg =
              "⏱️ 処理時間が5分を超えたため、タイムアウトしました。録音が長すぎるか、サーバーの負荷が高い可能性があります。もう一度お試しください。";
          } else {
            errorMsg =
              axiosErr?.response?.data?.error ||
              axiosErr?.message ||
              "解析に失敗しました。もう一度お試しください。";
          }
          onResult({ error: errorMsg } as AnalysisResult);
        } finally {
          setTimeout(() => {
            setLoading(false);
            setProgress(0);
            setStepLabel("");
          }, 500);
        }
      };

      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
        )();
      }

      const audioCtx = audioContextRef.current;
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 1024;

      if (sourceRef.current) sourceRef.current.disconnect();
      sourceRef.current = audioCtx.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      mediaRecorder.current.start();
      setRecording(true);

      setTimeout(() => {
        if (!animationIdRef.current) {
          drawVisualizer();
        }
      }, 100);
    } catch (e) {
      console.error("録音開始エラー:", e);
      alert("マイクの使用が許可されていないか、エラーが発生しました。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setRecording(false);
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center w-full gap-4">
      {/* 裏声なしオプション */}
      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={noFalsetto}
          onChange={(e) => setNoFalsetto(e.target.checked)}
          disabled={recording || loading}
          className="w-4 h-4 rounded border-slate-500 text-blue-500 focus:ring-blue-400"
        />
        裏声を使わない（地声のみで判定）
      </label>

      <div className="relative w-full max-w-4xl h-[500px] bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
        {recording && (
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="absolute inset-0 w-full h-full"
          />
        )}

        {!recording && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-4xl font-bold tracking-widest select-none pointer-events-none">
            READY
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-black/50 z-20 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-md h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full transition-all duration-1000 ease-out ${
                  progress >= 100 ? "bg-emerald-500" : "bg-blue-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white font-medium animate-pulse">{stepLabel}</p>
          </div>
        )}

        {!loading && (
          <div
            className={`absolute z-20 transition-all duration-500 ease-in-out ${
              recording ? "bottom-10" : "inset-0 flex items-center justify-center"
            }`}
          >
            {!recording ? (
              <button
                onClick={startRecording}
                className="w-24 h-24 bg-slate-600 hover:bg-slate-700 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl border-4 border-slate-400 group relative"
              >
                <span className="absolute inset-0 rounded-full border border-white/30 animate-ping" />
                <div className="flex flex-col items-center justify-center text-white">
                  <MicrophoneIcon className="w-10 h-10 group-hover:text-blue-300 transition-colors" />
                  <span className="text-xs mt-1 font-bold">START</span>
                </div>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-xl border-4 border-red-300 animate-pulse"
                aria-label="録音を停止"
              >
                <StopIcon className="w-10 h-10 text-white" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recorder;
