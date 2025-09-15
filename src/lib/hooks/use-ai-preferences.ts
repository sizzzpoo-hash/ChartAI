"use client";

import { useState, useEffect, useCallback } from "react";
import type { AiPreferences, RiskProfile } from "@/lib/types";

const PREFERENCES_KEY = "chartAlchemistAiPreferences";

const defaultPreferences: AiPreferences = {
  riskProfile: "moderate",
  detailedAnalysis: true,
};

export function useAiPreferences() {
  const [preferences, setPreferences] = useState<AiPreferences>(defaultPreferences);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load AI preferences from localStorage", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const updatePreferences = useCallback((newPrefs: Partial<AiPreferences>) => {
    setPreferences((currentPrefs) => {
      const updated = { ...currentPrefs, ...newPrefs };
      try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save AI preferences to localStorage", error);
      }
      return updated;
    });
  }, []);

  const setRiskProfile = useCallback(
    (riskProfile: RiskProfile) => {
      updatePreferences({ riskProfile });
    },
    [updatePreferences]
  );

  const setDetailedAnalysis = useCallback(
    (detailedAnalysis: boolean) => {
      updatePreferences({ detailedAnalysis });
    },
    [updatePreferences]
  );

  return {
    preferences,
    setRiskProfile,
    setDetailedAnalysis,
    isInitialized,
  };
}
