"use server";
import { analyzeChartAndGenerateTradeSignal } from "@/ai/flows/analyze-chart-and-generate-trade-signal";
import { getFundamentalAnalysis } from "@/ai/flows/get-fundamental-analysis";
import type { AiPreferences } from "@/lib/types";

export async function getAnalysis(
    chartDataUri: string, 
    ohlcData: string, 
    indicatorData: string, 
    preferences: AiPreferences,
    symbol?: string
) {
  try {
    let fundamentalAnalysisSummary: string | undefined = undefined;
    
    // If a symbol is provided, fetch fundamental analysis
    if (symbol) {
      const fundamentalData = await getFundamentalAnalysis({ symbol });
      fundamentalAnalysisSummary = fundamentalData.summary;
    }

    const result = await analyzeChartAndGenerateTradeSignal({ 
      chartDataUri, 
      ohlcData, 
      indicatorData,
      riskProfile: preferences.riskProfile,
      detailedAnalysis: preferences.detailedAnalysis,
      fundamentalAnalysisSummary,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting analysis:", error);

    let errorMessage = "An unknown error occurred during analysis.";
    if (error instanceof Error) {
      if (error.message.includes('UNAVAILABLE')) {
        errorMessage = 'The AI model is currently unavailable. Please try again later.';
      } else if (error.message.includes('INVALID_ARGUMENT')) {
        errorMessage = 'There was an issue with the data sent for analysis. Please refresh and try again.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, error: `Failed to get analysis: ${errorMessage}` };
  }
}
