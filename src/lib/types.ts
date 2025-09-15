import type { AnalyzeChartAndGenerateTradeSignalOutput } from "@/ai/flows/analyze-chart-and-generate-trade-signal";

export type AnalysisResult = {
  id: string;
  timestamp: string;
  analysis: AnalyzeChartAndGenerateTradeSignalOutput;
  chartImage: string;
};

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export type AiPreferences = {
  riskProfile: RiskProfile;
  detailedAnalysis: boolean;
};
