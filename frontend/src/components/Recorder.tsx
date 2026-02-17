import React, { useState, useRef, useEffect } from "react";
import { analyzeVoice, analyzeKaraoke } from "../api";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

interface Props {
  onResult: (data: any) => void;
  initialUseDemucs?: boolean;
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
  const [useDemucs, setUseDemucs] = useState(initialUseDemucs);
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
  const prevDataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    setUseDemucs(initialUseDemucs);
  }, [initialUseDemucs]);

  // Loading animation logic (existing)
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

  // Cleanup audio context and media stream on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // Stop MediaRecorder and Stream Tracks
      if (mediaRecorder.current) {
        if (mediaRecorder.current.state !== "inactive") {
          mediaRecorder.current.stop();
        }
        if (mediaRecorder.current.stream) {
          mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
        }
      }
    };
  }, []);

  // Start/Stop Visualizer when recording state changes
  useEffect(() => {
    if (recording && mediaRecorder.current && mediaRecorder.current.stream) {
      // Setup AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;

      // Resume context if suspended (browser policy)
      if (audioCtx.state === 'suspended') {
        void audioCtx.resume().catch((err) => {
          console.error("Failed to resume AudioContext:", err);
        });
      }

      // Cleanup previous nodes if any
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }

      analyserRef.current = audioCtx.createAnalyser();
      // Fixed FFT Size for Histogram (1024 = 512 frequency bins)
      // We want enough resolution for bass, but not too many bars to draw.
      analyserRef.current.fftSize = 1024;

      sourceRef.current = audioCtx.createMediaStreamSource(mediaRecorder.current.stream);
      sourceRef.current.connect(analyserRef.current);

      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      // Start drawing
      drawVisualizer();
    } else {
      // Stop animation when not recording
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    }
  }, [recording]);



  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current || !dataArrayRef.current || !prevDataRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    // --- FREQUENCY BARS (HISTOGRAM) FOR ALL MODES ---
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

    // Clear canvas
    ctx.fillStyle = "rgb(100, 116, 139)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Create Gradient (Light Purple to Light Blue)
    const gradient = ctx.createLinearGradient(0, HEIGHT, 0, 0);
    gradient.addColorStop(0, '#38bdf8'); // Sky 400
    gradient.addColorStop(1, '#a78bfa'); // Violet 400
    ctx.fillStyle = gradient;

    // --- MAPPING CONFIG ---
    // Total frequency bins (512 for fftSize 1024)
    const totalBins = dataArrayRef.current.length;

    // Effective Max Frequency Index:
    // We only care about up to ~10-12kHz for visual impact. 
    // Truncating the top end ensures the right side isn't just dead static.
    // 0.4 * 24000Hz = ~9600Hz.
    const maxBinIndex = Math.floor(totalBins * 0.4);

    const barCount = 80;
    const barWidth = (WIDTH / barCount) * 0.8;
    const gap = (WIDTH / barCount) * 0.2;

    // Helper to get interpolated value for fractional indices
    const getInterpolatedValue = (index: number) => {
      const i1 = Math.floor(index);
      const i2 = Math.min(i1 + 1, totalBins - 1);
      const t = index - i1; // fractional part

      if (!dataArrayRef.current) return 0; // Should not happen

      const v1 = dataArrayRef.current[i1];
      const v2 = dataArrayRef.current[i2];

      return v1 + (v2 - v1) * t;
    };

    let x = 0;

    for (let i = 0; i < barCount; i++) {
      const percent = i / barCount;

      // Logarithmic-ish mapping: x^2.0
      const indexMapping = Math.pow(percent, 2.0);

      // Map to our truncated range [0, maxBinIndex]
      const rawIndex = indexMapping * maxBinIndex;

      // Use interpolated value to fix "steps" on the low end
      const v = getInterpolatedValue(rawIndex);

      let barHeight = (v / 255) * HEIGHT * 0.95;
      if (barHeight < 5) barHeight = 5;

      ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
      x += barWidth + gap;
    }

    animationIdRef.current = requestAnimationFrame(drawVisualizer);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      // Note: Visualizer setup is now handled in the useEffect which watches [recording]

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setLoading(true);
        setProgress(0);

        // Stop visualizer
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }

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
      console.error(e);
      alert("マイクの使用が許可されていません。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
    mediaRecorder.current?.stop();
    }
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Visualizer Container */}
      <div className="relative w-full max-w-4xl h-[500px] bg-slate-500 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center">

        {/* Canvas for Visualizer */}
        {recording ? (
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          // Placeholder text removed as per user request
          loading && (
            <div className="text-white text-xl font-medium tracking-wide z-10 animate-pulse">
              解析中...
            </div>
          )
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 z-20 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-md h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full transition-all duration-1000 ease-out ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white font-medium animate-pulse">{stepLabel}</p>
          </div>
        )}

        {/* Recording Button */}
        {!loading && (
          <div className={`absolute z-20 transition-all duration-500 ease-in-out ${recording ? 'bottom-10' : 'inset-0 flex items-center justify-center'}`}>
            {!recording ? (
              <button
                onClick={startRecording}
                className="w-24 h-24 bg-slate-600 hover:bg-slate-700 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl border-4 border-slate-400 group relative"
              >
                {/* Ripple effect */}
                <span className="absolute inset-0 rounded-full border border-white/30 animate-ping"></span>

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