import React from "react";
import { useNavigate } from "react-router-dom";
import AnalysisResultPage from "../AnalysisResultPage";
import { useAppContext } from "../contexts/AppContext";

const AnalysisRoute: React.FC = () => {
  const navigate = useNavigate();
  const { result } = useAppContext();

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-2">
        <button
          onClick={() => navigate("/history")}
          className="text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
        >
          &larr; 戻る
        </button>
      </div>
      <AnalysisResultPage result={result} />
    </div>
  );
};

export default AnalysisRoute;
