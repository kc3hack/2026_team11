import React from "react";
import { useNavigate } from "react-router-dom";
import KaraokeUploader from "../components/KaraokeUploader";
import { useAppContext } from "../contexts/AppContext";
import { AnalysisResult } from "../api";

const UploaderPage: React.FC = () => {
  const navigate = useNavigate();
  const { setResult, setIsFromHistory } = useAppContext();

  const handleResult = (data: AnalysisResult) => {
    setResult(data);
    setIsFromHistory(false);
    navigate("/result");
  };

  return (
    <div className="min-h-screen bg-transparent p-8">
      <button
        onClick={() => navigate("/menu")}
        className="mb-6 text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
      >
        &larr; メニューに戻る
      </button>

      <div className="max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <KaraokeUploader onResult={handleResult} />
      </div>
    </div>
  );
};

export default UploaderPage;
