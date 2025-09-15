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
});
export type AnalyzeChartAndGenerateTradeSignalInput =
  z.infer<typeof AnalyzeChartAndGenerateTradeSignalInputSchema>;

const AnalyzeChartAndGenerateTradeSignalOutputSchema = z.object({
  analysisSummary: z.string().describe('A step-by-step summary of the candlestick chart analysis, including trend, support/resistance, and key patterns.'),
  tradeSignal: z.object({
    entryPriceRange: z.string().describe('The recommended entry price range.'),
    takeProfitLevels: z.array(z.string()).describe('The recommended take profit levels.'),
    stopLoss: z.string().describe('The recommended stop loss level, ensuring a risk/reward ratio of at least 1:2.'),
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
  prompt: `You are an expert crypto currency chart analyst acting as a conservative swing trader. Your goal is to identify high-probability trade setups with favorable risk-to-reward ratios.

Analyze the provided chart image, OHLC data, and technical indicator data by following these steps:
1.  **Identify the Overall Trend:** Use the OHLC data, SMA values, and the chart image to determine if the market is in an uptrend, downtrend, or consolidation on the given timeframe.
2.  **Identify Key Levels:** Pinpoint major support and resistance levels using the OHLC data.
3.  **Analyze Indicators & Patterns:** Look for candlestick patterns (e.g., engulfing, doji, hammer) near key levels. Use the provided RSI data to check for overbought/oversold conditions and the MACD data for momentum and potential trend reversals.
4.  **Synthesize and Summarize:** Provide a step-by-step summary of your findings from the steps above, integrating the visual chart with the raw OHLC and indicator data.
5.  **Generate a Trade Signal:** If a high-probability setup is identified, provide a clear trade signal. The stop loss must be placed at a logical level, and the take profit levels must ensure a minimum risk-to-reward ratio of 1:2. If no clear opportunity exists, state that and do not provide a trade signal.

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
