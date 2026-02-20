import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { AnalysisResult, UserRange } from "../api";

const RANGE_STORAGE_KEY = "voiceRange";

function loadSavedRange(): UserRange | null {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as UserRange;
  } catch { /* ignore */ }
  return null;
}

function saveRange(range: UserRange) {
  localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(range));
}

interface AppContextType {
  result: AnalysisResult | null;
  setResult: React.Dispatch<React.SetStateAction<AnalysisResult | null>>;
  userRange: UserRange | null;
  setUserRange: React.Dispatch<React.SetStateAction<UserRange | null>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isFromHistory: boolean;
  setIsFromHistory: React.Dispatch<React.SetStateAction<boolean>>;
  clearRange: () => void;
}

const AppContext = createContext<AppContextType>(null!);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [userRange, setUserRange] = useState<UserRange | null>(loadSavedRange);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFromHistory, setIsFromHistory] = useState(false);

  // 解析結果から音域を抽出して保存
  useEffect(() => {
    if (result && !result.error && result.chest_min_hz && result.chest_max_hz) {
      const range: UserRange = {
        chest_min_hz: result.chest_min_hz,
        chest_max_hz: result.chest_max_hz,
      };
      if (result.falsetto_max_hz) {
        range.falsetto_max_hz = result.falsetto_max_hz;
      }
      setUserRange(range);
      saveRange(range);
    }
  }, [result]);

  const clearRange = useCallback(() => {
    setUserRange(null);
    localStorage.removeItem(RANGE_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ result, setResult, userRange, setUserRange, searchQuery, setSearchQuery, isFromHistory, setIsFromHistory, clearRange }),
    [result, userRange, searchQuery, isFromHistory, clearRange]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
