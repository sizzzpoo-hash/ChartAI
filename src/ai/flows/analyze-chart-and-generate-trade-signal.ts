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
});
export type AnalyzeChartAndGenerateTradeSignalInput =
  z.infer<typeof AnalyzeChartAndGenerateTradeSignalInputSchema>;

const AnalyzeChartAndGenerateTradeSignalOutputSchema = z.object({
  analysisSummary: z.string().describe('A summary of the candlestick chart analysis.'),
  tradeSignal: z.object({
    entryPriceRange: z.string().describe('The recommended entry price range.'),
    takeProfitLevels: z.array(z.string()).describe('The recommended take profit levels.'),
    stopLoss: z.string().describe('The recommended stop loss level.'),
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
  prompt: `You are an expert crypto currency chart analyst.

You are provided with a candlestick chart image and its corresponding OHLC data. Analyze the chart and the data to generate a summary of the analysis, and based on the analysis, provide a trade signal including entry price range, take profit levels, and stop loss.  Do not be creative or take unneccessary risks, be very strict with the analysis.

Use the OHLC data as the primary source for precise price points and the image for pattern recognition.

Chart: {{media url=chartDataUri}}
OHLC Data:
{{{ohlcData}}}
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
