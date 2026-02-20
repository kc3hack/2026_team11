import React from "react";
import { useNavigate } from "react-router-dom";
import ResultView from "../components/ResultView";
import { useAppContext } from "../contexts/AppContext";

const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { result, isFromHistory } = useAppContext();

  return (
    <div className="min-h-screen bg-transparent p-8">
      <button
        onClick={() => navigate(isFromHistory ? "/history" : "/menu")}
        className="mb-6 text-slate-500 hover:text-cyan-400 font-bold flex items-center gap-2 transition-colors"
      >
        {isFromHistory ? "\u2190 履歴に戻る" : "\u2190 トップへ戻る"}
      </button>

      <div className="max-w-3xl mx-auto bg-transparent p-0 rounded-2xl">
        {result && <ResultView result={result} />}
      </div>
    </div>
  );
};

export default ResultPage;
