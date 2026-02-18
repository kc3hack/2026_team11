import React from 'react';
import { MusicalNoteIcon, ClockIcon, MicrophoneIcon, ChartBarIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneIconSolid } from '@heroicons/react/24/solid';

interface BottomNavProps {
    currentView: string;
    onViewChange: (view: any) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange }) => {
    // Helper to determine active state style
    const getItemClass = (viewName: string) => {
        return currentView === viewName
            ? "text-blue-600"
            : "text-slate-500 hover:text-slate-700";
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 px-2 pb-safe">
            <div className="flex justify-between items-end h-16 pb-2">

                {/* 1. Song List (was Home) */}
                <button
                    onClick={() => onViewChange('songList')}
                    className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${getItemClass('songList')}`}
                >
                    <MusicalNoteIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">楽曲一覧</span>
                </button>

                {/* 2. History */}
                <button
                    onClick={() => onViewChange('history')} // Placeholder view
                    className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${getItemClass('history')}`}
                >
                    <ClockIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">履歴</span>
                </button>

                {/* 3. Recording (Center - Special) */}
                <div className="flex-1 flex justify-center h-full relative group">
                    {/* Floating Button */}
                    <button
                        onClick={() => onViewChange('menu')}
                        className="absolute -top-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50 active:scale-95 transition-transform"
                    >
                        <MicrophoneIconSolid className="w-8 h-8 text-white" />
                    </button>
                    {/* Label below */}
                    <div className="flex flex-col justify-end pb-1 h-full pt-8">
                        <span className="text-[10px] font-medium text-slate-500 group-hover:text-blue-600 transition-colors">録音</span>
                    </div>
                </div>

                {/* 4. Analysis Result */}
                <button
                    onClick={() => onViewChange('analysis')}
                    className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${getItemClass('analysis')}`}
                >
                    <ChartBarIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">分析結果</span>
                </button>

                {/* 5. My Page */}
                <button
                    onClick={() => onViewChange('mypage')} // Placeholder view
                    className={`flex-1 flex flex-col items-center justify-end h-full py-1 ${getItemClass('mypage')}`}
                >
                    <UserCircleIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">マイページ</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
