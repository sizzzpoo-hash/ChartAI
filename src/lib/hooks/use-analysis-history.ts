"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  getAnalysisHistory,
  addAnalysisToHistory,
  clearAnalysisHistory,
} from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export function useAnalysisHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch history from Firestore when user is available
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getAnalysisHistory(user.uid)
        .then((userHistory) => {
          setHistory(userHistory);
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error("Failed to load analysis history from Firestore", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load analysis history.",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // If no user, clear history and set loading to false
      setHistory([]);
      setIsLoading(false);
      setIsInitialized(false);
    }
  }, [user, toast]);

  const addAnalysis = useCallback(
    async (result: Omit<AnalysisResult, "id">) => {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to save analysis history.",
        });
        return;
      }
      try {
        const docId = await addAnalysisToHistory(user.uid, result);
        const newEntry: AnalysisResult = { ...result, id: docId };
        setHistory((prevHistory) => [newEntry, ...prevHistory]);
      } catch (error) {
        console.error("Failed to save analysis to Firestore", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save analysis to your history.",
        });
      }
    },
    [user, toast]
  );

  const clearHistory = useCallback(async () => {
    if (!user) return;
    try {
      await clearAnalysisHistory(user.uid);
      setHistory([]);
    } catch (error) {
      console.error("Failed to clear history from Firestore", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not clear your analysis history.",
      });
    }
  }, [user, toast]);

  return {
    history,
    addAnalysis,
    clearHistory,
    isLoading,
    isInitialized,
  };
}
