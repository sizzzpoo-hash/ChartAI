
"use server";
import { analyzeChartAndGenerateTradeSignal } from "@/ai/flows/analyze-chart-and-generate-trade-signal";
import { getFundamentalAnalysis, type GetFundamentalAnalysisOutput } from "@/ai/flows/get-fundamental-analysis";
import { getEconomicEvents, type GetEconomicEventsOutput } from "@/ai/flows/get-economic-events";
import type { AiPreferences } from "@/lib/types";

// Helper function to determine the current trading session
function getCurrentSession(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();

  const isLondonOpen = utcHour >= 8 && utcHour < 17;
  const isNewYorkOpen = utcHour >= 13 && utcHour < 22;
  const isAsianOpen = utcHour >= 0 && utcHour < 9;

  if (isLondonOpen && isNewYorkOpen) {
    return "London/New York Overlap (High Volatility)";
  }
  if (isLondonOpen) {
    return "London Session";
  }
  if (isNewYorkOpen) {
    return "New York Session";
  }
  if (isAsianOpen) {
    return "Asian Session (Low Volatility)";
  }
  return "Session Closed";
}

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

    const currentSession = getCurrentSession();

    const result = await analyzeChartAndGenerateTradeSignal({ 
      chartDataUri, 
      ohlcData, 
      indicatorData,
      riskProfile: preferences.riskProfile,
      detailedAnalysis: preferences.detailedAnalysis,
      currentSession,
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
