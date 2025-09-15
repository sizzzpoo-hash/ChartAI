"use server";
import { analyzeChartAndGenerateTradeSignal } from "@/ai/flows/analyze-chart-and-generate-trade-signal";

export async function getAnalysis(chartDataUri: string) {
  try {
    const result = await analyzeChartAndGenerateTradeSignal({ chartDataUri });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
    return { success: false, error: `Failed to get analysis from AI: ${errorMessage}` };
  }
}
