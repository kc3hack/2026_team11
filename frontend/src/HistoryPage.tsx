// frontend/src/HistoryPage.tsx
import React, { useEffect, useState } from "react";
import { getAnalysisHistory, AnalysisHistoryRecord, deleteAnalysisHistory } from "./api";
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
    // ... 既存の fetchHistory 処理そのまま ...
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

  // 削除処理
  const handleDelete = async (recordId: string) => {
    if (!window.confirm("この履歴を削除しますか？")) return;

    try {
      await deleteAnalysisHistory(recordId);
      // 成功したら画面のリストから該当レコードを消す
      setHistory((prev) => prev.filter((record) => record.id !== recordId));
    } catch (err) {
      alert("削除に失敗しました。");
      console.error(err);
    }
  };

  // 未ログイン
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-transparent p-8">
        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8 text-center">
          {/* 履歴を表す時計のアイコンに変更 */}
          <svg 
            className="w-12 h-12 text-cyan-500/50 mx-auto mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          
          <h2 className="text-xl font-bold text-white mb-2">分析履歴</h2>
          <p className="text-slate-400 text-sm mb-6">
            ログインすると過去の分析履歴を確認できます
          </p>
          
          <button
            onClick={onLoginClick}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl px-6 py-3 text-sm transition-colors shadow-lg shadow-cyan-500/20"
          >
            ログインする
          </button>
        </div>
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
            <div key={record.id} className="bg-slate-800 p-6 rounded-xl border border-white/5 shadow-md flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative group">
              
              {/* === 左側のメタデータ部分 === */}
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
              
              {/* === 右側の音域表示と削除ボタン === */}
              <div className="flex items-center gap-4">
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
                
                {/* 追加: 削除ボタン */}
                <button
                  onClick={() => handleDelete(record.id)}
                  className="ml-2 px-3 py-2 bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors text-sm font-bold"
                  aria-label="履歴を削除"
                >
                  削除
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;