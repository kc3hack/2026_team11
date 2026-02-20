import React, { useState, useEffect, useRef } from "react";
import { analyzeKaraoke, AnalysisResult } from "../api";
import { CloudArrowUpIcon } from "@heroicons/react/24/solid";

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
  const [noFalsetto, setNoFalsetto] = useState(false);
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
      e.target.value = "";
      return;
    }

    setLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const data = await analyzeKaraoke(file, file.name, noFalsetto);
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
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">🎤 カラオケ音源で測定</h2>
        <p className="text-sm text-slate-500">
          歌入りの音源をアップロードしてください
          <br />
          <span className="text-xs text-slate-400">MP3, M4A, AAC, WAV, FLAC等対応</span>
        </p>
      </div>

      {/* ファイル選択エリア */}
      <label
        className={`w-full max-w-md flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
          loading
            ? "border-slate-200 bg-slate-50 cursor-not-allowed"
            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <CloudArrowUpIcon
          className={`w-12 h-12 ${loading ? "text-slate-300" : "text-slate-400"}`}
        />
        <div className="text-center">
          {fileName && !loading ? (
            <p className="text-sm font-medium text-slate-700">{fileName}</p>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-600">
                ファイルを選択 または ドロップ
              </p>
              <p className="text-xs text-slate-400 mt-1">最大ファイルサイズ: 制限なし</p>
            </>
          )}
        </div>
        <input
          type="file"
          accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.wma,.mp4"
          onChange={handleUpload}
          disabled={loading}
          className="hidden"
        />
      </label>

      {/* 裏声なしオプション */}
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={noFalsetto}
          onChange={(e) => setNoFalsetto(e.target.checked)}
          disabled={loading}
          className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
        />
        裏声を使わない（地声のみで判定）
      </label>

      {/* プログレスバー */}
      {loading && (
        <div className="w-full max-w-md">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                progress >= 100 ? "bg-emerald-500" : "bg-blue-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-slate-500 animate-pulse">{stepLabel}</p>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="w-full max-w-md bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm text-rose-600">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
};

export default KaraokeUploader;