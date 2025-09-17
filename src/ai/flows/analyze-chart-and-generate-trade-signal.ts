
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
      "The PRIMARY candlestick chart image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  ohlcData: z
    .string()
    .describe('A JSON string representing an array of OHLC (Open, High, Low, Close) data points for the primary chart.'),
  indicatorData: z
    .string()
    .describe('A JSON string representing calculated technical indicator data (SMA, RSI, MACD) for the primary chart.'),
  riskProfile: z
    .enum(['conservative', 'moderate', 'aggressive'])
    .describe('The user\'s risk profile for trading.'),
  detailedAnalysis: z
    .boolean()
    .describe('Whether to provide a detailed step-by-step analysis or just a brief summary.'),
  fundamentalAnalysisSummary: z
    .string()
    .optional()
    .describe('An optional summary of recent news and market sentiment for the asset.'),
}).catchall(z.string().describe(
    "Additional candlestick chart images for other timeframes as a data URI. The key should be in the format 'chartDataUri_<timeframe>', e.g., 'chartDataUri_1d'."
));
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
  prompt: `You are an expert crypto currency chart analyst using multi-timeframe analysis. Your trading style will adapt based on the user's provided risk profile: {{{riskProfile}}}.

You will be provided with a primary chart and potentially several other charts from different timeframes.

**Analysis Process:**
1.  **Establish Overall Trend (Higher Timeframes):** Start with the longest timeframe charts provided (e.g., 1d) to determine the macro trend (uptrend, downtrend, or consolidation).
2.  **Identify Key Levels (All Timeframes):** Pinpoint major support and resistance levels across all provided charts. Levels that appear on multiple timeframes are more significant.
3.  **Analyze the Primary Chart:** Now focus on the primary chart ({{{chartDataUri}}}). Analyze its candlestick patterns (e.g., engulfing, doji, hammer), momentum (using RSI and MACD from the provided data), and its position relative to the key levels identified in the previous step.
{{#if fundamentalAnalysisSummary}}
4.  **Consider Fundamental Context:** Review the provided fundamental analysis summary. Use this information to either strengthen your conviction in a technical signal or to exercise caution if the fundamentals contradict the technicals.
{{/if}}
5.  **Synthesize and Summarize:** Provide a summary of your multi-timeframe findings. Explain how the higher timeframe context influences your analysis of the primary timeframe. {{#if detailedAnalysis}}Provide a detailed, step-by-step breakdown.{{else}}Provide a brief, concise summary.{{/if}}
6.  **Generate a Trade Signal:** If a high-probability setup is identified where multiple timeframes align, provide a clear trade signal tailored to the '{{{riskProfile}}}' risk profile. The signal should be based on the primary chart, but confirmed by the context from the other timeframes.
    - **Conservative:** Focus on strong confirmation signals, wider stop losses placed at major structural levels, and more achievable take profit levels. Lower risk-to-reward is acceptable (e.g., 1:1.5).
    - **Moderate:** A balanced approach. Look for clear signals with good confirmation. Use logical stop losses and aim for a risk-to-reward ratio of at least 1:2.
    - **Aggressive:** Willing to enter trades on early signals or weaker confirmations. Use tighter stop losses to maximize potential reward, and set more ambitious take profit levels, aiming for a risk-to-reward ratio of 1:3 or higher.

If no clear opportunity exists or if timeframes are conflicting, state that and do not provide a trade signal.

Use the OHLC and indicator data as the primary source for precise price points on the main chart. Use all chart images for visual confirmation.

**Data Provided:**

Primary Chart: {{media url=chartDataUri}}
{{#if chartDataUri_1d}}1 Day Chart: {{media url=chartDataUri_1d}}{{/if}}
{{#if chartDataUri_4h}}4 Hour Chart: {{media url=chartDataUri_4h}}{{/if}}
{{#if chartDataUri_1h}}1 Hour Chart: {{media url=chartDataUri_1h}}{{/if}}
{{#if chartDataUri_15m}}15 Minute Chart: {{media url=chartDataUri_15m}}{{/if}}

Primary Chart OHLC Data:
{{{ohlcData}}}

Primary Chart Technical Indicator Data:
{{{indicatorData}}}
{{#if fundamentalAnalysisSummary}}

Fundamental Analysis Summary:
{{{fundamentalAnalysisSummary}}}
{{/if}}
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
  async (input: AnalyzeChartAndGenerateTradeSignalInput) => {
    try {
      const {output} = await analyzeChartAndGenerateTradeSignalPrompt(input);
      if (!output) {
        throw new Error('No output received from analysis prompt');
      }
      return output;
    } catch (error) {
      console.error('Failed to analyze chart:', error);
      // Re-throw the error so it can be caught by the calling function
      throw error;
    }
  }
);
