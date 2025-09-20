
"use client";

import { useState, useEffect, useCallback } from "react";

const SETTINGS_KEY = "chartAlchemistChartSettings";

export interface ChartSettings {
  symbol: string;
  primaryTimeframe: string;
  indicator: string;
  includeFundamentals: boolean;
  additionalTimeframes: string[];
}

const defaultSettings: ChartSettings = {
  symbol: "BTCUSDT",
  primaryTimeframe: "4h",
  indicator: "all",
  includeFundamentals: true,
  additionalTimeframes: ["1d", "1h"],
};

export function useChartSettings() {
  const [settings, setSettings] = useState<ChartSettings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const storedSettings = JSON.parse(stored);
        // Merge stored settings with defaults to avoid breaking changes if new settings are added
        setSettings({ ...defaultSettings, ...storedSettings });
      }
    } catch (error) {
      console.error("Failed to load chart settings from localStorage", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ChartSettings>) => {
    setSettings((currentSettings) => {
      const updated = { ...currentSettings, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save chart settings to localStorage", error);
      }
      return updated;
    });
  }, []);

  const setSymbol = useCallback((symbol: string) => updateSettings({ symbol }), [updateSettings]);
  const setPrimaryTimeframe = useCallback((primaryTimeframe: string) => updateSettings({ primaryTimeframe }), [updateSettings]);
  const setIndicator = useCallback((indicator: string) => updateSettings({ indicator }), [updateSettings]);
  const setIncludeFundamentals = useCallback((includeFundamentals: boolean) => updateSettings({ includeFundamentals }), [updateSettings]);
  const setAdditionalTimeframes = useCallback((additionalTimeframes: string[]) => updateSettings({ additionalTimeframes }), [updateSettings]);
  
  return {
    settings,
    setSymbol,
    setPrimaryTimeframe,
    setIndicator,
    setIncludeFundamentals,
    setAdditionalTimeframes,
    isInitialized,
  };
}
