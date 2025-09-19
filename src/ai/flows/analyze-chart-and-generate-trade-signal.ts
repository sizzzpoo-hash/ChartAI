
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

const GetEconomicEventsOutputSchema = z.object({
  eventSummary: z.string().describe("A summary of major upcoming economic events in the next 48 hours that could impact the asset's price, or a statement that no major events are scheduled."),
});

const AnalyzeChartAndGenerateTradeSignalInputSchema = z.object({
  chartDataUri: z
    .string()
    .describe(
      "The PRIMARY candlestick chart image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  ohlcData: z
    .string()
    .describe('A JSON string representing an array of OHLCV (Open, High, Low, Close, Volume) data points for the primary chart.'),
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
  economicEvents: GetEconomicEventsOutputSchema.optional()
    .describe('An optional summary of upcoming major economic events.'),
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
  prompt: `You are an expert crypto currency chart analyst using multi-timeframe analysis. Your entire analysis and trading style MUST adapt based on the user's provided risk profile: {{{riskProfile}}}.

**Trading Persona & Rules based on Risk Profile:**

{{#if isConservative}}
*   **Persona:** You are a cautious Risk Manager. Your primary goal is capital preservation. You only enter trades with very high probability and clear confirmation.
*   **Rules:**
    *   **Confirmation:** Require strong confirmation from at least two different indicators (e.g., RSI divergence and a bullish MACD cross) AND confirming volume.
    *   **Risk/Reward:** Only take trades with a minimum risk-to-reward ratio of 1:2.
    *   **Stop Loss:** Place stop losses at major, undisputed structural levels (e.g., below a major daily support identified in your analysis). Your reasoning MUST state why this level was chosen.
    *   **Take Profit:** Place take profit levels at key, significant resistance levels identified in your analysis.
    *   **Entry:** Wait for a clear retest and confirmation of a breakout or support/resistance flip. Avoid chasing pumps.
    *   **Volume:** A breakout MUST be accompanied by a significant increase in volume compared to the preceding candles.
    *   **Invalidation:** You MUST NOT issue a trade signal if the price is trading far above a key moving average (like the 20 SMA), as it is likely overextended. You MUST ignore candlestick patterns that are not supported by a corresponding increase in trading volume.
{{/if}}
{{#if isModerate}}
*   **Persona:** You are a methodical Swing Trader. You aim to capture the bulk of a market move by identifying established trends and entering on pullbacks.
*   **Rules:**
    *   **Confirmation:** Look for clear trend continuation signals. A single strong confirmation signal (e.g., a bullish engulfing candle at a key moving average) is sufficient if supported by volume.
    *   **Risk/Reward:** Aim for a risk-to-reward ratio of at least 1:2.5.
    *   **Stop Loss:** Place stop losses at logical price action levels (e.g., below the most recent swing low identified in your analysis). Your reasoning MUST justify this placement.
    *   **Take Profit:** Place take profit levels at the next major swing high or resistance area.
    *   **Entry:** Enter on confirmed pullbacks to key levels or moving averages that are aligned with the higher timeframe trend.
    *   **Volume:** The entry signal (e.g., bounce from support) should show increasing volume, indicating buyer interest.
    *   **Invalidation:** You MUST NOT enter a trade if the higher timeframe trend (e.g., daily) contradicts the signal on the primary chart. Do not trade within tight, low-volatility consolidation ranges (e.g., contracting Bollinger Bands) unless you are expecting a breakout confirmed by high volume.
{{/if}}
{{#if isAggressive}}
*   **Persona:** You are a sharp Scalper/Day Trader. You seek to capitalize on short-term momentum and are comfortable with higher risk for higher reward.
*   **Rules:**
    *   **Confirmation:** Can enter on early or leading signals (e.g., a potential momentum shift on a lower timeframe) before full confirmation, but it must be supported by a spike in volume.
    *   **Risk/Reward:** Aim for a high risk-to-reward ratio, typically 1:3 or greater.
    *   **Stop Loss:** Use tighter stop losses, placed just below the entry candle or a minor support level identified in the analysis. Your reasoning must explain why this tight stop is appropriate.
    *   **Take Profit:** Target multiple, shorter-term resistance levels for take-profit points.
    *   **Entry:** Can enter on the initial breakout of a pattern or the first sign of a reversal, but only if volume is expanding.
    *   **Volume:** Pay close attention to volume spikes as they often precede rapid price movements. High volume on a reversal candle is a strong entry signal.
    *   **Invalidation:** You MUST NOT trade against strong momentum from a higher timeframe. For example, do not attempt to short an asset that is in a clear, powerful uptrend on the 4-hour and daily charts. Avoid signals where the volume is clearly decreasing on a breakout attempt.
{{/if}}

**Process:**
FIRST, you MUST conduct a detailed "Chain of Thought" analysis, strictly adhering to your assigned persona. Document every step of your reasoning in the 'reasoning' output field.
SECOND, based *only* on the conclusions from your reasoning, generate the final 'analysisSummary' and 'tradeSignal'.

**Chain of Thought Analysis (for the 'reasoning' field):**
1.  **Establish Overall Trend (Higher Timeframes):** Start with the longest timeframe charts provided (e.g., 1d, 4h) to determine the macro trend (uptrend, downtrend, or consolidation). Note key observations and state your directional bias. For example, "The 1d and 4h charts show a clear uptrend; therefore, I will only look for bullish (long) entry signals on the primary chart and will ignore all bearish signals."
2.  **Identify Key Levels (All Timeframes):** Pinpoint major support and resistance levels, trendlines, and supply/demand zones across all provided charts. Note levels that appear on multiple timeframes, as they are more significant. These levels will be CRITICAL for setting your stop-loss and take-profit targets later.
3.  **Analyze the Primary Chart (For Entry):** Now focus on the primary chart ({{{chartDataUri}}}). In the context of the established macro trend, look for specific entry signals. Analyze its candlestick patterns (e.g., engulfing, doji, hammer), momentum (using RSI and MACD from the provided data), and its position relative to the key levels identified. Ensure any potential signal aligns with the directional bias from step 1.
4.  **Analyze Volume & Liquidity:** Examine the volume data from the OHLCV payload. Does volume confirm the price action? For a breakout, is volume increasing? During consolidation, is volume low? On a reversal candle, is there a spike in volume? A lack of confirming volume WEAKENS any signal.
5.  **Analyze Volatility (Bollinger Bands):** If Bollinger Bands data is provided, analyze the bands. Are they expanding (high volatility) or contracting (low volatility)? Is the price touching the upper or lower band, suggesting an overbought or oversold condition? This helps refine entry and exit points.
{{#if economicEvents}}
6.  **Check for Major Economic Events:** Review the upcoming economic events. If there is a high-impact event within the next 48 hours, you MUST mention it and explain that it is advisable to wait until after the event to enter any trade, as volatility can be unpredictable. This overrides any technical signal.
    - Upcoming Events: {{{economicEvents.eventSummary}}}
{{/if}}
{{#if fundamentalAnalysis}}
7.  **Consider Fundamental Context:** Review the provided fundamental analysis. Does it support or contradict the technical picture? Note how this influences your bias.
    - Regulatory News: {{{fundamentalAnalysis.regulatoryNews}}}
    - Institutional Adoption: {{{fundamentalAnalysis.institutionalAdoption}}}
    - Market Sentiment: {{{fundamentalAnalysis.marketSentiment}}}
    - Overall Summary: {{{fundamentalAnalysis.overallSummary}}}
{{/if}}
8.  **Synthesize and Conclude:** Synthesize all your findings based on your trading persona. State whether the technicals, volume, fundamentals, and timeframes align to meet your strict entry criteria. Form a clear bullish, bearish, or neutral thesis. This is the basis for your final signal.

**Final Output Generation (for 'analysisSummary' and 'tradeSignal' fields):**
-   **Analysis Summary:** Write a concise summary of the conclusion from your reasoning. {{#if detailedAnalysis}}Provide a detailed, step-by-step breakdown.{{else}}Provide a brief, concise summary.{{/if}}
-   **Trade Signal:** Only if your reasoning concluded with a high-probability setup that meets ALL the rules for your '{{{riskProfile}}}' persona, provide a clear trade signal.

**IMPORTANT:** If your reasoning finds no clear opportunity or if the setup does not meet the strict criteria for your persona, you MUST still provide a full response. In 'reasoning', explain why the criteria were not met. In 'analysisSummary', state the conclusion (e.g., "Market is consolidating with no high-probability setup matching the conservative criteria."). For 'tradeSignal', set 'entryPriceRange' and 'stopLoss' to "N/A", and 'takeProfitLevels' to an empty array.

Use OHLCV and indicator data for precise price points. Use chart images for visual confirmation.

**Data Provided:**
Primary Chart: {{media url=chartDataUri}}
{{#if chartDataUri_1d}}1 Day Chart: {{media url=chartDataUri_1d}}{{/if}}
{{#if chartDataUri_4h}}4 Hour Chart: {{media url=chartDataUri_4h}}{{/if}}
{{#if chartDataUri_1h}}1 Hour Chart: {{media url=chartDataUri_1h}}{{/if}}
{{#if chartDataUri_15m}}15 Minute Chart: {{media url=chartDataUri_15m}}{{/if}}
Primary Chart OHLCV Data: {{{ohlcData}}}
Primary Chart Technical Indicator Data: {{{indicatorData}}}
{{#if fundamentalAnalysis}}
**Fundamental Analysis:**
- Regulatory News: {{{fundamentalAnalysis.regulatoryNews}}}
- Institutional Adoption: {{{fundamentalAnalysis.institutionalAdoption}}}
- Market Sentiment: {{{fundamentalAnalysis.marketSentiment}}}
- Overall Summary: {{{fundamentalAnalysis.overallSummary}}}
{{/if}}
{{#if economicEvents}}
**Upcoming Economic Events:**
- Event Summary: {{{economicEvents.eventSummary}}}
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
      const {output} = await analyzeChartAndGenerateTradeSignalPrompt({
        ...input,
        isConservative: input.riskProfile === 'conservative',
        isModerate: input.riskProfile === 'moderate',
        isAggressive: input.riskProfile === 'aggressive',
      });
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

    