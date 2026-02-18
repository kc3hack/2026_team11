import React, { useState, useRef, useEffect, useCallback } from "react";
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

  useEffect(() => {
    setUseDemucs(initialUseDemucs);
  }, [initialUseDemucs]);

  // Loading animation logic
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

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  // ビジュアライザー描画関数
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current || !dataArrayRef.current) {
      // キャンバスが見つからない場合も少し待って再トライ
      animationIdRef.current = requestAnimationFrame(drawVisualizer);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // 背景クリア
    ctx.fillStyle = "rgb(100, 116, 139)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // グラデーション作成
    const gradient = ctx.createLinearGradient(0, HEIGHT, 0, 0);
    gradient.addColorStop(0, '#38bdf8'); // Sky 400
    gradient.addColorStop(1, '#a78bfa'); // Violet 400
    ctx.fillStyle = gradient;

    const totalBins = dataArrayRef.current.length;
    // 高音域（右側）は成分が少ないのでカットして表示
    const maxBinIndex = Math.floor(totalBins * 0.4);

    const barCount = 80;
    const barWidth = (WIDTH / barCount) * 0.8;
    const gap = (WIDTH / barCount) * 0.2;

    let x = 0;

    for (let i = 0; i < barCount; i++) {
      const percent = i / barCount;
      const indexMapping = Math.pow(percent, 2.0); // 低音域を広く取る
      const rawIndex = Math.floor(indexMapping * maxBinIndex);
      
      // 安全策: 配列外参照を防ぐ
      const valueIndex = Math.min(rawIndex, totalBins - 1);
      const v = dataArrayRef.current[valueIndex];

      let barHeight = (v / 255) * HEIGHT * 0.95;
      if (barHeight < 5) barHeight = 5; // 最低限の高さを保証

      ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
      x += barWidth + gap;
    }

    animationIdRef.current = requestAnimationFrame(drawVisualizer);
  }, []);

  // 録音開始時の処理
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 1. MediaRecorderのセットアップ
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      // 録音停止時の処理
      mediaRecorder.current.onstop = async () => {
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
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
          
        } catch (err: any) {
          const serverMsg =
            err?.response?.data?.error ||
            err?.message ||
            "解析に失敗しました。もう一度お試しください。";
          onResult({ error: serverMsg });
        } finally {
          // 少し待ってからローディング表示を消す
          setTimeout(() => {
            setLoading(false);
            setProgress(0);
            setStepLabel("");
          }, 500);
        }
      };

      // 2. AudioContextのセットアップ（ビジュアライザー用）
      // ここで初期化されていない場合は作成する
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioCtx = audioContextRef.current;
      
      // TypeScriptエラー回避: audioCtxがnullでないことを確認
      if (!audioCtx) {
        console.error("AudioContextの初期化に失敗しました");
        return;
      }

      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 1024;
      
      // 既存の接続があれば切る
      if (sourceRef.current) sourceRef.current.disconnect();
      
      sourceRef.current = audioCtx.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      // 3. 録音開始
      mediaRecorder.current.start();
      setRecording(true);
      
      // 4. 描画開始（少し遅らせてDOM生成を待つ）
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
    setRecording(false);
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-4xl h-[500px] bg-slate-500 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center">

        {/* キャンバス: 録音中のみ表示 */}
        {recording && (
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="absolute inset-0 w-full h-full"
          />
        )}

        {/* 待機中の表示（録音していないとき） */}
        {!recording && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-4xl font-bold tracking-widest select-none pointer-events-none">
            READY
          </div>
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

        {/* Start/Stop Button */}
        {!loading && (
          <div className={`absolute z-20 transition-all duration-500 ease-in-out ${recording ? 'bottom-10' : 'inset-0 flex items-center justify-center'}`}>
            {!recording ? (
              <button
                onClick={startRecording}
                className="w-24 h-24 bg-slate-600 hover:bg-slate-700 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl border-4 border-slate-400 group relative"
              >
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