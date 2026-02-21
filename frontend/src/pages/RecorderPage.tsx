import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Recorder from "../components/Recorder";
import { useAppContext } from "../contexts/AppContext";
import { AnalysisResult } from "../api";

const RecorderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setResult, setIsFromHistory } = useAppContext();
  const isKaraokeMode = location.pathname === "/karaoke";

  const handleResult = (data: AnalysisResult) => {
    setResult(data);
    setIsFromHistory(false);
    navigate("/result");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-transparent p-6 sm:p-8 overflow-hidden font-sans text-slate-300">
      <button
        onClick={() => navigate("/menu")}
        className="mb-6 text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
      >
        &larr; メニューに戻る
      </button>

      <div className="max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <h2 className="text-3xl sm:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-8 text-center drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] tracking-wider">
          {isKaraokeMode ? "KARAOKE RECORDING" : "MIC RECORDING"}
        </h2>
        <Recorder onResult={handleResult} initialUseDemucs={isKaraokeMode} />
      </div>
    </div>
  );
};

export default RecorderPage;
