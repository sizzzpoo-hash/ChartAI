"use server";
import { analyzeChartAndGenerateTradeSignal } from "@/ai/flows/analyze-chart-and-generate-trade-signal";

export async function getAnalysis(chartDataUri: string, ohlcData: string, indicatorData: string) {
  try {
    const result = await analyzeChartAndGenerateTradeSignal({ chartDataUri, ohlcData, indicatorData });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting analysis:", error);

    let errorMessage = "An unknown error occurred during analysis.";
    if (error instanceof Error) {
      // Check for common AI-related error messages if needed, otherwise use the message.
      // For instance, you could check for specific strings if the error messages are consistent.
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
