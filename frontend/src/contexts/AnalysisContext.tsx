import React, { createContext, useState, useContext, ReactNode, useRef } from 'react';

export type AnalysisMode = 'upload' | 'karaoke_record' | 'mic_record' | null;

interface AnalysisContextType {
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  progress: number;
  setProgress: (progress: number | ((prev: number) => number)) => void;
  stepLabel: string;
  setStepLabel: (label: string) => void;
  startAnalysisTimer: (mode: AnalysisMode) => void;
  stopAnalysisTimer: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

const STEPS_UPLOAD = [
  { progress: 10, label: "⚡ 音源を読み込み中..." },
  { progress: 35, label: "🎤 超高速ボーカル分離中..." },
  { progress: 60, label: "🎵 もう少しで完了..." },
  { progress: 85, label: "📊 音域を解析中..." },
];

const STEPS_DEMUCS = [
  { progress: 20, label: "⚡ 超高速ボーカル分離中..." },
  { progress: 50, label: "🎵 ボーカル抽出中（1〜2分）..." },
  { progress: 75, label: "🎶 もうすぐ完了..." },
  { progress: 90, label: "📊 音域を解析中..." },
];

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  
  // タイマーの参照を保持
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAnalysisTimer = (mode: AnalysisMode) => {
    setIsAnalyzing(true);
    let stepIndex = 0;
    
    // 既存のタイマーが動いていればクリアする
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (mode === 'upload') {
      setProgress(STEPS_UPLOAD[0].progress);
      setStepLabel(STEPS_UPLOAD[0].label);
      timerRef.current = setInterval(() => {
        stepIndex++;
        if (stepIndex < STEPS_UPLOAD.length) {
          setProgress(STEPS_UPLOAD[stepIndex].progress);
          setStepLabel(STEPS_UPLOAD[stepIndex].label);
        }
      }, 8000);
    } else if (mode === 'karaoke_record') {
      setProgress(STEPS_DEMUCS[0].progress);
      setStepLabel(STEPS_DEMUCS[0].label);
      timerRef.current = setInterval(() => {
        stepIndex++;
        if (stepIndex < STEPS_DEMUCS.length) {
          setProgress(STEPS_DEMUCS[stepIndex].progress);
          setStepLabel(STEPS_DEMUCS[stepIndex].label);
        }
      }, 8000);
    } else if (mode === 'mic_record') {
      setProgress(50);
      setStepLabel("解析中...");
      // マイク録音はステップ進行なし
    }
  };

  const stopAnalysisTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <AnalysisContext.Provider value={{ 
      isAnalyzing, setIsAnalyzing, 
      progress, setProgress, 
      stepLabel, setStepLabel,
      startAnalysisTimer, stopAnalysisTimer
    }}>
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};