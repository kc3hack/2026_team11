import React, { useState, useEffect, useRef } from "react";
import { analyzeKaraoke, AnalysisResult } from "../api";
import { CloudArrowUpIcon, DocumentArrowUpIcon } from "@heroicons/react/24/solid";

interface Props {
  onResult: (data: AnalysisResult) => void;
}

const STEPS = [
  { progress: 10, label: "⚡ 音源を読み込み中..." },
  { progress: 35, label: "🎤 超高速ボーカル分離中..." },
  { progress: 60, label: "🎵 もう少しで完了..." },
  { progress: 85, label: "📊 音域を解析中..." },
];

const KaraokeUploader: React.FC<Props> = ({ onResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = async (file: File) => {
    // 対応フォーマットチェック
    const supportedExts = [".wav", ".mp3", ".m4a", ".aac", ".mp4", ".ogg", ".flac", ".wma", ".webm"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const isAudio =
      file.type.startsWith("audio/") ||
      file.type.startsWith("video/") ||
      supportedExts.includes(ext);

    if (!isAudio) {
      setError(
        "対応していないファイル形式です。音声ファイル（MP3, M4A, AAC, WAV, FLAC等）をアップロードしてください。"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const data = await analyzeKaraoke(file, file.name);
      setProgress(100);
      setStepLabel("完了！");
      if (data.error) {
        setError(data.error);
      } else {
        onResult(data);
      }
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; message?: string; response?: { data?: { error?: string } } };
      if (axiosErr?.code === "ECONNABORTED" || axiosErr?.message?.includes("timeout")) {
        setError(
          "⏱️ 処理時間が5分を超えたため、タイムアウトしました。音源が長すぎるか、サーバーの負荷が高い可能性があります。もう一度お試しください。"
        );
      } else {
        setError(
          axiosErr?.response?.data?.error ||
          "解析に失敗しました。もう一度お試しください。"
        );
      }
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setStepLabel("");
      }, 500);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!loading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto font-sans relative z-10 p-4 sm:p-8">

      {/* Header Typography */}
      <div className="text-center w-full">
        <h2 className="text-3xl sm:text-4xl font-black italic text-fuchsia-400 mb-4 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)] tracking-wide">
          🎤 UPLOAD KARAOKE
        </h2>
        <p className="text-sm sm:text-base text-fuchsia-200 font-bold tracking-wide drop-shadow-md">
          歌入りの音源をアップロードして解析を開始します
        </p>
        <p className="text-xs text-fuchsia-400 mt-2 tracking-widest uppercase">
          [ SUPPORTED: MP3, M4A, AAC, WAV, FLAC ]
        </p>
      </div>

      {/* Cyberpunk Dropzone ("Data Transfer Gate") */}
      <div className="w-full relative group perspective-1000 mt-4">
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onMouseEnter={() => !loading && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`relative w-full aspect-video sm:aspect-[21/9] flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-300 block overflow-hidden
            ${loading ? "bg-fuchsia-950/60 cursor-not-allowed cursor-wait" : "bg-gradient-to-br from-fuchsia-950/40 via-fuchsia-900/30 to-fuchsia-950/40 hover:bg-fuchsia-900/40"}
          `}
          style={{
            clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)',
            boxShadow: isDragging || isHovered ? '0 0 30px rgba(232,121,249,0.4)' : '0 0 15px rgba(0,0,0,0.5)'
          }}
        >
          {/* Border (inner neon) */}
          <div className={`absolute inset-0 border-2 transition-all duration-300 pointer-events-none z-10 ${isDragging || isHovered ? 'border-fuchsia-400 shadow-[inset_0_0_20px_rgba(232,121,249,0.6)] animate-pulse' : 'border-fuchsia-500/50'
            }`}
            style={{ clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)' }}></div>

          {/* Digital Grid Pattern */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(232, 121, 249, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 121, 249, 0.5) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}>
          </div>

          {/* Interaction Particle Scanlines Overlay */}
          <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 ${isDragging || (isHovered && !loading) ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-full h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(232,121,249,0.2)_50%,transparent_100%)] bg-[length:100%_4px] animate-scan"></div>
          </div>

          {/* Giant Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center z-0 pointer-events-none">
            <span className="text-4xl sm:text-6xl md:text-7xl font-black italic text-fuchsia-400 opacity-5 sm:opacity-[0.03] tracking-widest whitespace-nowrap">
              DROP FILE HERE
            </span>
          </div>

          {/* Content */}
          <div className="relative z-20 flex flex-col items-center justify-center text-center transform transition-transform duration-300 group-hover:scale-105">
            {fileName && !loading ? (
              <div className="flex flex-col items-center gap-3">
                <DocumentArrowUpIcon className="w-16 h-16 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]" />
                <p className="text-lg font-bold text-fuchsia-100 bg-fuchsia-950/50 px-4 py-2 rounded-lg border border-fuchsia-500/30">
                  {fileName}
                </p>
                <p className="text-xs text-fuchsia-400 font-bold italic mt-2 animate-pulse">CLICK OR DROP AGAIN TO CHANGE</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <CloudArrowUpIcon
                  className={`w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 ${loading ? "text-slate-500" : "text-fuchsia-400 drop-shadow-[0_0_15px_rgba(232,121,249,0.8)]"
                    } ${isDragging ? "scale-110" : ""}`}
                />
                <div className="space-y-1">
                  <p className="text-lg sm:text-xl font-bold italic text-fuchsia-100 tracking-wide">
                    {isDragging ? (
                      <span className="text-fuchsia-300 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)] animate-pulse">RELEASE TO TRANSFER</span>
                    ) : (
                      <span>CLICK OR DROP FILE</span>
                    )}
                  </p>
                  <p className="text-xs text-fuchsia-300/60 font-medium tracking-widest">
                    MAX SIZE: UNLIMITED
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hide original input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.wma,.mp4"
            onChange={handleUpload}
            disabled={loading}
            className="hidden"
          />
        </label>

        {/* Decorative Corner Accents */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-fuchsia-400 z-20 opacity-50 pointer-events-none shadow-[0_0_5px_rgba(232,121,249,1)]"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-fuchsia-400 z-20 opacity-50 pointer-events-none shadow-[0_0_5px_rgba(232,121,249,1)]"></div>
      </div>

      {/* Progress Bar (Loading State) */}
      {loading && (
        <div className="w-full max-w-lg mt-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-500/30 shadow-[0_0_20px_rgba(232,121,249,0.2)]">
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-4 shadow-inner border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(232,121,249,0.8)] ${progress >= 100 ? "bg-cyan-400" : "bg-fuchsia-500"
                }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm font-bold italic text-fuchsia-300 tracking-wider animate-pulse drop-shadow-[0_0_5px_rgba(232,121,249,0.5)]">
            {stepLabel}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="w-full max-w-lg bg-red-950/80 backdrop-blur-md border border-red-500/50 rounded-xl p-4 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <p className="text-sm font-bold text-red-400 tracking-wide text-center">
            <span className="animate-pulse mr-2">⚠️</span>
            {error}
          </p>
        </div>
      )}

    </div>
  );
};

export default KaraokeUploader;