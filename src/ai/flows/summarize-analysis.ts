'use server';

/**
 * @fileOverview AI-powered chart analysis and trade signal generation.
 *
 * - analyzeChart - Analyzes a given candlestick chart and provides a summary and trade signals.
 * - AnalyzeChartInput - The input type for the analyzeChart function.
 * - AnalyzeChartOutput - The return type for the analyzeChart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeChartInputSchema = z.object({
  chartData: z
    .string()
    .describe(
      'The candlestick chart data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' /* e.g., data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA... */
    ),
});
export type AnalyzeChartInput = z.infer<typeof AnalyzeChartInputSchema>;

const AnalyzeChartOutputSchema = z.object({
  analysisSummary: z.string().describe('A summary of the candlestick chart analysis.'),
  tradeSignal: z.object({
    entryPriceRange: z.string().describe('The recommended entry price range for the trade.'),
    takeProfit: z.array(z.string()).describe('The recommended take profit levels for the trade.'),
    stopLoss: z.string().describe('The recommended stop loss level for the trade.'),
  }).describe('Trade signal based on the chart analysis'),
});
export type AnalyzeChartOutput = z.infer<typeof AnalyzeChartOutputSchema>;

export async function analyzeChart(input: AnalyzeChartInput): Promise<AnalyzeChartOutput> {
  return analyzeChartFlow(input);
}

const analyzeChartPrompt = ai.definePrompt({
  name: 'analyzeChartPrompt',
  input: {schema: AnalyzeChartInputSchema},
  output: {schema: AnalyzeChartOutputSchema},
  prompt: `You are an expert financial analyst specializing in candlestick chart pattern analysis. You are strict and must not be creative with your analysis.

  Analyze the provided candlestick chart image and provide a concise summary of the analysis and a precise trade signal including entry price range, take profit(s), and stop loss.

  Chart Image: {{media url=chartData}}

  Ensure the analysis is very strict and based only on the chart patterns.  Do not be random, and do not be creative.

  Output the analysis summary and trade signal in a structured format.`, 
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

const analyzeChartFlow = ai.defineFlow(
  {
    name: 'analyzeChartFlow',
    inputSchema: AnalyzeChartInputSchema,
    outputSchema: AnalyzeChartOutputSchema,
  },
  async input => {
    const {output} = await analyzeChartPrompt(input);
    return output!;
  }
);
