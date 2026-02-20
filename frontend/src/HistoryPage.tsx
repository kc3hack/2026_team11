import React, { useEffect, useState } from "react";
import { getAnalysisHistory, AnalysisHistoryRecord } from "./api";
import { useAuth } from "./contexts/AuthContext";

interface HistoryPageProps {
  onLoginClick: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onLoginClick }) => {
  const { isAuthenticated } = useAuth();
  const [history, setHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const data = await getAnalysisHistory();
        setHistory(data);
      } catch (err: any) {
        setError("履歴の取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">分析履歴</h2>
        <p className="text-slate-400 mb-6">履歴を見るにはログインが必要です。</p>
        <button
          onClick={onLoginClick}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all"
        >
          ログインする
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-white border-b border-white/10 pb-4">分析履歴</h2>

      {loading ? (
        <div className="text-center text-slate-400">読み込み中...</div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-center text-slate-400 bg-slate-800/50 p-8 rounded-2xl">
          履歴がありません。録音・アップロードして分析してみましょう。
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <div key={record.id} className="bg-slate-800 p-6 rounded-xl border border-white/5 shadow-md flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">
                  {new Date(record.created_at).toLocaleString('ja-JP')}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${
                    record.source_type === 'karaoke' ? 'bg-purple-900 text-purple-300' : 'bg-cyan-900 text-cyan-300'
                  }`}>
                    {record.source_type === 'karaoke' ? 'カラオケ' : record.source_type === 'microphone' ? 'マイク' : 'ファイル'}
                  </span>
                  {record.file_name && (
                    <span className="text-slate-300 truncate max-w-[200px]">{record.file_name}</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-slate-900 px-4 py-2 rounded-lg text-center min-w-[100px]">
                  <p className="text-xs text-slate-500 mb-1">地声</p>
                  <p className="font-mono font-bold text-cyan-400">
                    {record.vocal_range_min || '-'} ~ {record.vocal_range_max || '-'}
                  </p>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg text-center min-w-[80px]">
                  <p className="text-xs text-slate-500 mb-1">裏声最高</p>
                  <p className="font-mono font-bold text-pink-400">
                    {record.falsetto_max || '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;