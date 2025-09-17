'use server';
/**
 * @fileOverview Retrieves and summarizes fundamental analysis for a crypto asset.
 *
 * - getFundamentalAnalysis - A function that fetches news and sentiment.
 * - GetFundamentalAnalysisInput - The input type for the getFundamentalAnalysis function.
 * - GetFundamentalAnalysisOutput - The return type for the getFundamentalAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const GetFundamentalAnalysisInputSchema = z.object({
  symbol: z.string().describe('The cryptocurrency symbol to analyze (e.g., BTCUSDT).'),
});
export type GetFundamentalAnalysisInput = z.infer<typeof GetFundamentalAnalysisInputSchema>;

const GetFundamentalAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the recent news and market sentiment.'),
});
export type GetFundamentalAnalysisOutput = z.infer<typeof GetFundamentalAnalysisOutputSchema>;

export async function getFundamentalAnalysis(
  input: GetFundamentalAnalysisInput
): Promise<GetFundamentalAnalysisOutput> {
  return getFundamentalAnalysisFlow(input);
}

const fundamentalAnalysisPrompt = ai.definePrompt({
  name: 'fundamentalAnalysisPrompt',
  input: {schema: GetFundamentalAnalysisInputSchema},
  output: {schema: GetFundamentalAnalysisOutputSchema},
  prompt: `You are a financial news analyst. Your task is to provide a concise summary of the recent news and overall market sentiment for the following cryptocurrency: {{{symbol}}}.

Focus on key news events, market trends, and any significant positive or negative sentiment that could impact the price. Keep the summary to 2-3 sentences.`,
  tools: [googleAI.googleSearchTool],
  model: googleAI('gemini-2.5-flash-lite'),
});

const getFundamentalAnalysisFlow = ai.defineFlow(
  {
    name: 'getFundamentalAnalysisFlow',
    inputSchema: GetFundamentalAnalysisInputSchema,
    outputSchema: GetFundamentalAnalysisOutputSchema,
  },
  async input => {
    const {output} = await fundamentalAnalysisPrompt(input);
    return output!;
  }
);
