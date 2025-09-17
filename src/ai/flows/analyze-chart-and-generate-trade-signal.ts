
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

const GetFundamentalAnalysisOutputSchema = z.object({
  regulatoryNews: z.string().describe('A summary of recent news related to regulatory changes or government involvement for the asset in the last 7 days.'),
  institutionalAdoption: z.string().describe('A summary of any recent news or reports on institutional adoption, major investments, or significant wallet movements.'),
  marketSentiment: z.string().describe('A summary of the current market sentiment (e.g., bullish, bearish, neutral) based on social media trends and news headlines.'),
  overallSummary: z.string().describe('A concise, one-sentence overall summary of the fundamental outlook for the asset.'),
});

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
    .describe('A JSON string representing calculated technical indicator data (SMA, RSI, MACD, Bollinger Bands) for the primary chart.'),
  riskProfile: z
    .enum(['conservative', 'moderate', 'aggressive'])
    .describe('The user\'s risk profile for trading.'),
  detailedAnalysis: z
    .boolean()
    .describe('Whether to provide a detailed step-by-step analysis or just a brief summary.'),
  fundamentalAnalysis: GetFundamentalAnalysisOutputSchema.optional()
    .describe('An optional summary of recent news and market sentiment for the asset.'),
}).catchall(z.string().describe(
    "Additional candlestick chart images for other timeframes as a data URI. The key should be in the format 'chartDataUri_<timeframe>', e.g., 'chartDataUri_1d'."
));
export type AnalyzeChartAndGenerateTradeSignalInput =
  z.infer<typeof AnalyzeChartAndGenerateTradeSignalInputSchema>;

const AnalyzeChartAndGenerateTradeSignalOutputSchema = z.object({
  reasoning: z.string().describe("The AI's detailed, step-by-step chain of thought during the analysis process. This should outline the observations and logic used to arrive at the final conclusion."),
  analysisSummary: z.string().describe('A concise, final summary of the analysis, derived from the reasoning process. If no clear signal is found, explain why.'),
  tradeSignal: z.object({
    entryPriceRange: z.string().describe('The recommended entry price range. If no signal, state "N/A".'),
    takeProfitLevels: z.array(z.string()).describe('The recommended take profit levels. If no signal, return an empty array.'),
    stopLoss: z.string().describe('The recommended stop loss level, ensuring an appropriate risk/reward ratio for the given risk profile. If no signal, state "N/A".'),
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

**Process:**
FIRST, you MUST conduct a detailed "Chain of Thought" analysis. Document every step of your reasoning in the 'reasoning' output field.
SECOND, based *only* on the conclusions from your reasoning, generate the final 'analysisSummary' and 'tradeSignal'.

**Chain of Thought Analysis (for the 'reasoning' field):**
1.  **Establish Overall Trend (Higher Timeframes):** Start with the longest timeframe charts provided (e.g., 1d) to determine the macro trend (uptrend, downtrend, or consolidation). Note key observations.
2.  **Identify Key Levels (All Timeframes):** Pinpoint major support and resistance levels across all provided charts. Note levels that appear on multiple timeframes, as they are more significant.
3.  **Analyze the Primary Chart:** Now focus on the primary chart ({{{chartDataUri}}}). Analyze its candlestick patterns (e.g., engulfing, doji, hammer), momentum (using RSI and MACD from the provided data), and its position relative to the key levels identified.
4.  **Analyze Volatility (Bollinger Bands):** If Bollinger Bands data is provided, analyze the bands. Are they expanding (high volatility) or contracting (low volatility)? Is the price touching the upper or lower band, suggesting an overbought or oversold condition?
{{#if fundamentalAnalysis}}
5.  **Consider Fundamental Context:** Review the provided fundamental analysis. Does it support or contradict the technical picture? Note how this influences your bias.
    - Regulatory News: {{{fundamentalAnalysis.regulatoryNews}}}
    - Institutional Adoption: {{{fundamentalAnalysis.institutionalAdoption}}}
    - Market Sentiment: {{{fundamentalAnalysis.marketSentiment}}}
    - Overall Summary: {{{fundamentalAnalysis.overallSummary}}}
{{/if}}
6.  **Synthesize and Conclude:** Synthesize your findings. State whether the timeframes are aligned or conflicting. Form a clear bullish, bearish, or neutral thesis. This is the basis for your final signal.

**Final Output Generation (for 'analysisSummary' and 'tradeSignal' fields):**
-   **Analysis Summary:** Write a concise summary of the conclusion from your reasoning. {{#if detailedAnalysis}}Provide a detailed, step-by-step breakdown.{{else}}Provide a brief, concise summary.{{/if}}
-   **Trade Signal:** If your reasoning concluded with a high-probability setup, provide a clear trade signal tailored to the '{{{riskProfile}}}' risk profile.
    - **Conservative:** Focus on strong confirmation signals, wider stop losses at major structural levels, and achievable take profit levels. Lower risk-to-reward is acceptable (e.g., 1:1.5).
    - **Moderate:** Balanced approach. Look for clear signals with good confirmation. Use logical stop losses and aim for a risk-to-reward of at least 1:2.
    - **Aggressive:** Enter on early signals. Use tighter stop losses to maximize reward, aiming for a risk-to-reward of 1:3 or higher.

**IMPORTANT:** If your reasoning finds no clear opportunity or conflicting signals, you MUST still provide a full response. In 'reasoning', explain why. In 'analysisSummary', state the conclusion (e.g., "Market is consolidating with conflicting signals"). For 'tradeSignal', set 'entryPriceRange' and 'stopLoss' to "N/A", and 'takeProfitLevels' to an empty array.

Use OHLC and indicator data for precise price points. Use chart images for visual confirmation.

**Data Provided:**
Primary Chart: {{media url=chartDataUri}}
{{#if chartDataUri_1d}}1 Day Chart: {{media url=chartDataUri_1d}}{{/if}}
{{#if chartDataUri_4h}}4 Hour Chart: {{media url=chartDataUri_4h}}{{/if}}
{{#if chartDataUri_1h}}1 Hour Chart: {{media url=chartDataUri_1h}}{{/if}}
{{#if chartDataUri_15m}}15 Minute Chart: {{media url=chartDataUri_15m}}{{/if}}
Primary Chart OHLC Data: {{{ohlcData}}}
Primary Chart Technical Indicator Data: {{{indicatorData}}}
{{#if fundamentalAnalysis}}
**Fundamental Analysis:**
- Regulatory News: {{{fundamentalAnalysis.regulatoryNews}}}
- Institutional Adoption: {{{fundamentalAnalysis.institutionalAdoption}}}
- Market Sentiment: {{{fundamentalAnalysis.marketSentiment}}}
- Overall Summary: {{{fundamentalAnalysis.overallSummary}}}
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
