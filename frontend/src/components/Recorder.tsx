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
            ? await analyzeKaraoke(blob, "recording.webm")
            : await analyzeVoice(blob);

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
    <div className="flex flex-col items-center w-full font-sans">
      <div className="relative w-full max-w-4xl h-[500px] bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center group">

        {/* Visualizer Canvas during recording */}
        {recording && (
          <div className="absolute inset-0 w-full h-full opacity-60">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )}

        {/* Ambient background glow (idle) */}
        {!recording && !loading && (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute inset-0 flex items-center justify-center text-cyan-400/10 text-6xl sm:text-8xl md:text-[10rem] font-black italic tracking-widest select-none pointer-events-none drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] z-0 mix-blend-screen">
              READY
            </div>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 border-t-4 border-b-4 border-cyan-400 rounded-full animate-spin mb-8 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
            <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden mb-4 shadow-inner border border-slate-700">
              <div
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(34,211,238,0.8)] ${progress >= 100 ? "bg-emerald-400" : "bg-cyan-400"
                  }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-cyan-300 font-bold italic tracking-wide animate-pulse drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">{stepLabel}</p>
          </div>
        )}

        {/* Recording Controls */}
        {!loading && (
          <div className={`absolute z-20 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${recording ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-110" : "inset-0 flex items-center justify-center"
            }`}
          >
            {!recording ? (
              // --- Idle State Button ---
              <button
                onClick={startRecording}
                className="relative w-28 h-28 bg-slate-800 hover:bg-slate-700 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] border-2 border-cyan-500/50 hover:border-cyan-400 group z-10"
              >
                {/* Ripple Effect 1 */}
                <span className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />
                {/* Ripple Effect 2 (Delayed) */}
                <span className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] pointer-events-none" />

                <MicrophoneIcon className="w-12 h-12 text-slate-300 group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0)] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-xs mt-1 font-black italic text-cyan-400 tracking-wider">START</span>
              </button>
            ) : (
              // --- Recording State Button ---
              <div className="relative flex items-center justify-center group">
                {/* 15s Progress Ring SVG */}
                <svg className="absolute w-[180px] h-[180px] -rotate-90 pointer-events-none drop-shadow-[0_0_10px_rgba(232,121,249,0.8)]">
                  <circle
                    cx="90"
                    cy="90"
                    r="84"
                    fill="none"
                    className="stroke-slate-800"
                    strokeWidth="6"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r="84"
                    fill="none"
                    className="stroke-fuchsia-400 transition-all duration-100 ease-linear"
                    strokeWidth="6"
                    strokeDasharray="132 396"
                    strokeDashoffset="0"
                    style={{
                      animation: "spinRing 2s linear infinite"
                    }}
                  />
                </svg>
                {/* Embedded CSS for animation */}
                <style>{`
                  @keyframes spinRing {
                    from { transform: rotate(0deg); transform-origin: center; }
                    to { transform: rotate(360deg); transform-origin: center; }
                  }
                  @keyframes pulseShadow {
                    0% { box-shadow: 0 0 20px rgba(232,121,249,0.4), inset 0 0 10px rgba(0,0,0,0.5); }
                    50% { box-shadow: 0 0 50px rgba(232,121,249,0.8), inset 0 0 10px rgba(0,0,0,0.5); }
                    100% { box-shadow: 0 0 20px rgba(232,121,249,0.4), inset 0 0 10px rgba(0,0,0,0.5); }
                  }
                `}</style>

                <button
                  onClick={stopRecording}
                  className="w-24 h-24 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full flex items-center justify-center transition-all transform hover:scale-105 border-4 border-fuchsia-300 relative z-10"
                  style={{ animation: "pulseShadow 1.5s infinite" }}
                  aria-label="録音を停止"
                >
                  <StopIcon className="w-12 h-12 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />

                  {/* Subtle record indicator icon inside */}
                  <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-ping"></div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recorder;
