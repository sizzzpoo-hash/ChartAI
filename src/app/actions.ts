
"use server";
import { analyzeChartAndGenerateTradeSignal } from "@/ai/flows/analyze-chart-and-generate-trade-signal";
import { getFundamentalAnalysis, type GetFundamentalAnalysisOutput } from "@/ai/flows/get-fundamental-analysis";
import { getEconomicEvents, type GetEconomicEventsOutput } from "@/ai/flows/get-economic-events";
import type { AiPreferences } from "@/lib/types";

export async function getAnalysis(
    chartDataUri: string, 
    ohlcData: string, 
    indicatorData: string, 
    preferences: AiPreferences,
    symbol?: string,
    multiTimeframeData?: { [key: string]: string }
) {
  try {
    let fundamentalAnalysis: GetFundamentalAnalysisOutput | undefined = undefined;
    let economicEvents: GetEconomicEventsOutput | undefined = undefined;
    
    // If a symbol is provided, fetch fundamental analysis and economic events
    if (symbol) {
      try {
        // Run both fetches in parallel to save time
        const [faResult, eeResult] = await Promise.all([
          getFundamentalAnalysis({ symbol }),
          getEconomicEvents({ symbol })
        ]);
        fundamentalAnalysis = faResult;
        economicEvents = eeResult;
      } catch (newsError) {
        console.warn("Failed to get fundamental or economic data, continuing without it:", newsError);
        // Continue without this data rather than failing completely
        fundamentalAnalysis = undefined;
        economicEvents = undefined;
      }
    }

    const result = await analyzeChartAndGenerateTradeSignal({ 
      chartDataUri, 
      ohlcData, 
      indicatorData,
      riskProfile: preferences.riskProfile,
      detailedAnalysis: preferences.detailedAnalysis,
      fundamentalAnalysis,
      economicEvents,
      ...multiTimeframeData,
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
