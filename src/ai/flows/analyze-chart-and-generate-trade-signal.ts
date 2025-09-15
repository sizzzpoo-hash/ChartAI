'use server';
/**
 * @fileOverview Analyzes a candlestick chart and generates trade signals.
 *
 * - analyzeChartAndGenerateTradeSignal - A function that analyzes the chart and generates trade signals.
 * - AnalyzeChartAndGenerateTradeSignalInput - The input type for the analyzeChartAndGenerateTradeSignal function.
 * - AnalyzeChartAndGenerateTradeSignalOutput - The return type for the analyzeChartAndGenerateTradeSignal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeChartAndGenerateTradeSignalInputSchema = z.object({
  chartDataUri: z
    .string()
    .describe(
      "A candlestick chart image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  ohlcData: z
    .string()
    .describe('A JSON string representing an array of OHLC (Open, High, Low, Close) data points for the chart.'),
  indicatorData: z
    .string()
    .describe('A JSON string representing calculated technical indicator data (SMA, RSI, MACD).'),
  riskProfile: z
    .enum(['conservative', 'moderate', 'aggressive'])
    .describe('The user\'s risk profile for trading.'),
  detailedAnalysis: z
    .boolean()
    .describe('Whether to provide a detailed step-by-step analysis or just a brief summary.'),
});
export type AnalyzeChartAndGenerateTradeSignalInput =
  z.infer<typeof AnalyzeChartAndGenerateTradeSignalInputSchema>;

const AnalyzeChartAndGenerateTradeSignalOutputSchema = z.object({
  analysisSummary: z.string().describe('A step-by-step summary of the candlestick chart analysis, including trend, support/resistance, and key patterns.'),
  tradeSignal: z.object({
    entryPriceRange: z.string().describe('The recommended entry price range.'),
    takeProfitLevels: z.array(z.string()).describe('The recommended take profit levels.'),
    stopLoss: z.string().describe('The recommended stop loss level, ensuring an appropriate risk/reward ratio for the given risk profile.'),
  }),
});
export type AnalyzeChartAndGenerateTradeSignalOutput =
  z.infer<typeof AnalyzeChartAndGenerateTradeSignalOutputSchema>;

export async function analyzeChartAndGenerateTradeSignal(
  input: AnalyzeChartAndGenerateTradeSignalInput
): Promise<AnalyzeChartAndGenerateTradeSignalOutput> {
  return analyzeChartAndGenerateTradeSignalFlow(input);
}

const analyzeChartAndGenerateTradeSignalPrompt = ai.definePrompt({
  name: 'analyzeChartAndGenerateTradeSignalPrompt',
  input: {schema: AnalyzeChartAndGenerateTradeSignalInputSchema},
  output: {schema: AnalyzeChartAndGenerateTradeSignalOutputSchema},
  prompt: `You are an expert crypto currency chart analyst. Your trading style will adapt based on the user's provided risk profile: {{{riskProfile}}}.

Analyze the provided chart image, OHLC data, and technical indicator data by following these steps:
1.  **Identify the Overall Trend:** Use the OHLC data, SMA values, and the chart image to determine if the market is in an uptrend, downtrend, or consolidation on the given timeframe.
2.  **Identify Key Levels:** Pinpoint major support and resistance levels using the OHLC data.
3.  **Analyze Indicators & Patterns:** Look for candlestick patterns (e.g., engulfing, doji, hammer) near key levels. Use the provided RSI data to check for overbought/oversold conditions and the MACD data for momentum and potential trend reversals.
4.  **Synthesize and Summarize:** Provide a summary of your findings. {{#if detailedAnalysis}}Provide a detailed, step-by-step breakdown of your analysis.{{else}}Provide a brief, concise summary of the key findings.{{/if}}
5.  **Generate a Trade Signal:** If a high-probability setup is identified, provide a clear trade signal tailored to the '{{{riskProfile}}}' risk profile.
    - **Conservative:** Focus on strong confirmation signals, wider stop losses placed at major structural levels, and more achievable take profit levels. Lower risk-to-reward is acceptable (e.g., 1:1.5).
    - **Moderate:** A balanced approach. Look for clear signals with good confirmation. Use logical stop losses and aim for a risk-to-reward ratio of at least 1:2.
    - **Aggressive:** Willing to enter trades on early signals or weaker confirmations. Use tighter stop losses to maximize potential reward, and set more ambitious take profit levels, aiming for a risk-to-reward ratio of 1:3 or higher.

If no clear opportunity exists, state that and do not provide a trade signal.

Use the OHLC and indicator data as the primary source for precise price points and calculations. Use the chart image for visual confirmation of patterns and trends.

Chart: {{media url=chartDataUri}}

OHLC Data:
{{{ohlcData}}}

Technical Indicator Data:
{{{indicatorData}}}
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const analyzeChartAndGenerateTradeSignalFlow = ai.defineFlow(
  {
    name: 'analyzeChartAndGenerateTradeSignalFlow',
    inputSchema: AnalyzeChartAndGenerateTradeSignalInputSchema,
    outputSchema: AnalyzeChartAndGenerateTradeSignalOutputSchema,
  },
  async input => {
    const {output} = await analyzeChartAndGenerateTradeSignalPrompt(input);
    return output!;
  }
);
