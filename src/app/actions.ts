
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
        const [faResult, eeResult] = await Promise.allSettled([
          getFundamentalAnalysis({ symbol }),
          getEconomicEvents({ symbol })
        ]);
        
        // Handle fundamental analysis result
        if (faResult.status === 'fulfilled') {
          fundamentalAnalysis = faResult.value;
        } else {
          console.warn('Fundamental analysis failed:', faResult.reason);
          // Provide a basic fallback
          fundamentalAnalysis = {
            regulatoryNews: 'Unable to retrieve current regulatory news',
            institutionalAdoption: 'Unable to retrieve current institutional adoption data',
            marketSentiment: 'Mixed - monitor current market conditions',
            overallSummary: 'Fundamental analysis unavailable - focus on technical indicators'
          };
        }
        
        // Handle economic events result
        if (eeResult.status === 'fulfilled') {
          economicEvents = eeResult.value;
        } else {
          console.warn('Economic events failed:', eeResult.reason);
          // Provide a basic fallback
          economicEvents = {
            eventSummary: 'Economic events data unavailable - monitor major economic calendars and central bank announcements'
          };
        }
      } catch (newsError) {
        console.warn("Unexpected error in fundamental/economic data fetch:", newsError);
        // Provide fallback data instead of leaving undefined
        fundamentalAnalysis = {
          regulatoryNews: 'Data retrieval temporarily unavailable',
          institutionalAdoption: 'Data retrieval temporarily unavailable',
          marketSentiment: 'Mixed',
          overallSummary: 'Focus on technical analysis as fundamental data is temporarily unavailable'
        };
        economicEvents = {
          eventSummary: 'Economic events monitoring temporarily unavailable - check major financial calendars'
        };
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
