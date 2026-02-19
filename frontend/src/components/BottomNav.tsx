import React from "react";
import {
  MusicalNoteIcon,
  HeartIcon,
  ChartBarIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { MicrophoneIcon as MicrophoneIconSolid } from "@heroicons/react/24/solid";

interface BottomNavProps {
  currentView: string;
  onViewChange: (view: any) => void;
  isAuthenticated?: boolean;
}

// 録音関連のビューをまとめて判定
const RECORDING_VIEWS = new Set(["menu", "recorder", "uploader"]);

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, isAuthenticated = false }) => {
  const getItemClass = (viewName: string) =>
    currentView === viewName
      ? "text-blue-600"
      : "text-slate-500 hover:text-slate-700";

  const isRecordingActive = RECORDING_VIEWS.has(currentView);

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 px-2 pb-safe">
      <div className="flex justify-between items-end h-16 pb-2">

        {/* 1. 楽曲一覧 */}
        <button
          onClick={() => onViewChange("songList")}
          className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${getItemClass("songList")}`}
        >
          <MusicalNoteIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">楽曲一覧</span>
        </button>

        {/* 2. お気に入り */}
        <button
          onClick={() => onViewChange("favorites")}
          className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${getItemClass("favorites")}`}
        >
          <HeartIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">お気に入り</span>
        </button>

        {/* 3. 録音 (Center - Special) */}
        <div className="flex-1 flex justify-center h-full relative group">
          <button
            onClick={() => onViewChange("menu")}
            className={`absolute -top-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 active:scale-95 transition-all ${
              isRecordingActive
                ? "bg-blue-700 border-blue-200 scale-105"
                : "bg-blue-600 border-slate-50"
            }`}
            aria-label="録音"
          >
            <MicrophoneIconSolid className="w-8 h-8 text-white" />
          </button>
          <div className="flex flex-col justify-end pb-1 h-full pt-8">
            <span
              className={`text-[10px] font-medium transition-colors ${
                isRecordingActive
                  ? "text-blue-600"
                  : "text-slate-500 group-hover:text-blue-600"
              }`}
            >
              録音
            </span>
          </div>
        </div>

        {/* 4. 分析結果 */}
        <button
          onClick={() => onViewChange("analysis")}
          className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${
            currentView === "analysis" || currentView === "result"
              ? "text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ChartBarIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">分析結果</span>
        </button>

        {/* 5. マイページ / ログイン */}
        <button
          onClick={() => onViewChange(isAuthenticated ? "mypage" : "login")}
          className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${getItemClass(isAuthenticated ? "mypage" : "login")}`}
        >
          <UserCircleIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">
            {isAuthenticated ? "マイページ" : "ログイン"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
