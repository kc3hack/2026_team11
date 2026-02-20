import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AnalysisContextType {
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  // ★進捗バーとテキストの状態を追加
  progress: number;
  setProgress: (progress: number | ((prev: number) => number)) => void;
  stepLabel: string;
  setStepLabel: (label: string) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");

  return (
    <AnalysisContext.Provider value={{ 
      isAnalyzing, setIsAnalyzing, 
      progress, setProgress, 
      stepLabel, setStepLabel 
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