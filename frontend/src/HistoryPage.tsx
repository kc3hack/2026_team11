// frontend/src/HistoryPage.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  getAnalysisHistory,
  AnalysisHistoryRecord,
  deleteAnalysisHistory,
} from "./api";
import { useAuth } from "./contexts/AuthContext";

interface HistoryPageProps {
  onLoginClick: () => void;
  onSelectRecord: (record: AnalysisHistoryRecord) => void;
}

interface SwipeState {
  startX: number;
  currentX: number;
  startTime: number;
}

const HistoryPage: React.FC<HistoryPageProps> = ({
  onLoginClick,
  onSelectRecord,
}) => {
  const { isAuthenticated } = useAuth();
  const [history, setHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const swipeStates = useRef<Record<string, SwipeState>>({});

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

  // 削除処理（確認あり）
  const handleDelete = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation(); // 親要素のクリックイベント（画面遷移）を防ぐ
    if (!window.confirm("この履歴を削除しますか？")) return;

    await performDelete(recordId);
  };

  // 削除実行（確認なし - スワイプ用）
  const performDelete = async (recordId: string) => {
    // 削除アニメーション開始
    setDeletingId(recordId);
    setSwipedId(null);
    setSwipeOffset(0);

    // アニメーション時間を待つ（300ms）
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await deleteAnalysisHistory(recordId);
      // 成功したら画面のリストから該当レコードを消す
      setHistory((prev) => prev.filter((record) => record.id !== recordId));
    } catch (err) {
      alert("削除に失敗しました。");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  // スワイプハンドラー
  const handleTouchStart = (e: React.TouchEvent, recordId: string) => {
    const touch = e.touches[0];
    swipeStates.current[recordId] = {
      startX: touch.clientX,
      currentX: touch.clientX,
      startTime: Date.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent, recordId: string) => {
    const touch = e.touches[0];
    const state = swipeStates.current[recordId];
    if (!state) return;

    state.currentX = touch.clientX;
    const diff = state.startX - touch.clientX;

    // リアルタイムでスワイプ位置を更新
    if (diff > 0) {
      // 最大250pxまでスワイプ可能（150px超えると削除確定エリア）
      const offset = Math.min(diff, 250);
      setSwipeOffset(offset);
      setSwipedId(recordId);
    } else {
      setSwipeOffset(0);
      setSwipedId(null);
    }
  };

  const handleTouchEnd = async (recordId: string) => {
    const state = swipeStates.current[recordId];
    if (!state) return;

    const diff = state.startX - state.currentX;

    // スワイプ判定
    if (diff > 150) {
      // 150px以上：自動削除（確認なし）
      delete swipeStates.current[recordId];
      await performDelete(recordId);
    } else if (diff > 60) {
      // 60-150px：削除ボタンを表示したまま
      setSwipedId(recordId);
      setSwipeOffset(120);
      delete swipeStates.current[recordId];
    } else {
      // 60px未満：元に戻す
      setSwipedId(null);
      setSwipeOffset(0);
      delete swipeStates.current[recordId];
    }
  };

  // スワイプをキャンセル（クリックで戻す）
  const cancelSwipe = () => {
    setSwipedId(null);
    setSwipeOffset(0);
  };

  // 未ログイン
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-transparent p-8">
        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8 text-center">
          {/* 履歴を表す時計のアイコン */}
          <svg
            className="w-12 h-12 text-cyan-500/50 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
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
      <h2 className="text-3xl font-bold mb-8 text-white border-b border-white/10 pb-4">
        分析履歴
      </h2>

      {loading ? (
        <div className="text-center text-slate-400">読み込み中...</div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-center text-slate-400 bg-slate-800/50 p-8 rounded-2xl">
          履歴がありません。録音・アップロードして分析してみましょう。
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <div
              key={record.id}
              className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
                deletingId === record.id
                  ? "opacity-0 -translate-x-full max-h-0 my-0"
                  : "opacity-100 translate-x-0 max-h-96"
              }`}
              onTouchStart={(e) => handleTouchStart(e, record.id)}
              onTouchMove={(e) => handleTouchMove(e, record.id)}
              onTouchEnd={() => handleTouchEnd(record.id)}
            >
              {/* === 背景：削除ボタン === */}
              <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 rounded-xl">
                <button
                  onClick={(e) => handleDelete(e, record.id)}
                  className="flex items-center gap-2 text-white font-bold text-sm"
                  aria-label="削除"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  削除
                </button>
              </div>

              {/* === 前面：履歴アイテム === */}
              <div
                style={{
                  transform:
                    swipedId === record.id
                      ? `translateX(-${swipeOffset}px)`
                      : "translateX(0)",
                  transition: swipeStates.current[record.id]
                    ? "none"
                    : "transform 0.2s ease-out",
                }}
                className="bg-slate-800 p-6 rounded-xl border border-white/5 shadow-md flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative group cursor-pointer hover:bg-slate-700/80"
                onClick={() => {
                  if (swipedId === record.id) {
                    cancelSwipe();
                  } else {
                    onSelectRecord(record);
                  }
                }}
              >
                {/* === 左側のメタデータ部分 === */}
                <div>
                  <p className="text-sm text-slate-400 mb-1">
                    {new Date(record.created_at).toLocaleString("ja-JP")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded font-bold ${
                        record.source_type === "karaoke"
                          ? "bg-purple-900 text-purple-300"
                          : "bg-cyan-900 text-cyan-300"
                      }`}
                    >
                      {record.source_type === "karaoke"
                        ? "カラオケ"
                        : record.source_type === "microphone"
                          ? "マイク"
                          : "ファイル"}
                    </span>
                    {record.file_name && (
                      <span className="text-slate-300 truncate max-w-[200px]">
                        {record.file_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* === 右側の音域表示と削除ボタン（PC用） === */}
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 px-4 py-2 rounded-lg text-center min-w-[100px]">
                    <p className="text-xs text-slate-500 mb-1">地声</p>
                    <p className="font-mono font-bold text-cyan-400">
                      {record.vocal_range_min || "-"} ~{" "}
                      {record.vocal_range_max || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-900 px-4 py-2 rounded-lg text-center min-w-[80px]">
                    <p className="text-xs text-slate-500 mb-1">裏声最高</p>
                    <p className="font-mono font-bold text-pink-400">
                      {record.falsetto_max || "-"}
                    </p>
                  </div>

                  {/* 削除ボタン（PC用 - タッチデバイスでは非表示） */}
                  <button
                    onClick={(e) => handleDelete(e, record.id)}
                    className="hidden sm:block ml-2 px-3 py-2 bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors text-sm font-bold z-10"
                    aria-label="履歴を削除"
                  >
                    削除
                  </button>

                  {/* スワイプ状態インジケーター（モバイル用） */}
                  {swipedId === record.id && (
                    <div className="sm:hidden text-red-400 text-xs font-bold">
                      スワイプで削除
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(HistoryPage);
