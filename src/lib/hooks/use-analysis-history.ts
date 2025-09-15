"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "@/lib/types";

const HISTORY_KEY = "chartAlchemistHistory";

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load analysis history from localStorage", error);
    } finally {
        setIsInitialized(true);
    }
  }, []);

  const addAnalysis = useCallback((result: AnalysisResult) => {
    setHistory((prevHistory) => {
      const newHistory = [result, ...prevHistory].slice(0, 50); // Keep last 50 analyses
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error("Failed to save analysis to localStorage", error);
      }
      return newHistory;
    });
  }, []);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Failed to clear history from localStorage", error);
    }
  }, []);

  return { history: isInitialized ? history : [], addAnalysis, clearHistory, isInitialized };
}
