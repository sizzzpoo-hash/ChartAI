
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
  regulatoryNews: z.string().describe('A summary of recent news related to regulatory changes or government involvement for the asset in the last 7 days.'),
  institutionalAdoption: z.string().describe('A summary of any recent news or reports on institutional adoption, major investments, or significant wallet movements.'),
  marketSentiment: z.string().describe('A summary of the current market sentiment (e.g., bullish, bearish, neutral) based on social media trends and news headlines.'),
  overallSummary: z.string().describe('A concise, one-sentence overall summary of the fundamental outlook for the asset.'),
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
  prompt: `You are a financial news analyst for the cryptocurrency market. Your task is to use the search tool to find and summarize the most critical fundamental information for {{{symbol}}}.

Provide targeted summaries for the following specific categories. If you cannot find relevant information for a category, state "No significant news found."

1.  **Regulatory News:** Summarize any news related to regulatory changes, government discussions, or legal matters impacting the asset in the last 7 days.
2.  **Institutional Adoption:** Summarize any recent news, announcements, or reports regarding institutional investment, partnerships, or large-scale adoption.
3.  **Market Sentiment:** Based on news headlines and social media, what is the current overall market sentiment (e.g., Bullish, Bearish, Neutral with caution)?
4.  **Overall Summary:** Provide a final, one-sentence summary of the fundamental outlook.`,
  tools: [googleAI.googleSearchTool],
  model: 'googleai/gemini-2.5-flash',
});

const getFundamentalAnalysisFlow = ai.defineFlow(
  {
    name: 'getFundamentalAnalysisFlow',
    inputSchema: GetFundamentalAnalysisInputSchema,
    outputSchema: GetFundamentalAnalysisOutputSchema,
  },
  async input => {
    try {
      const {output} = await fundamentalAnalysisPrompt(input);
      return output || { 
          regulatoryNews: 'No significant news found.',
          institutionalAdoption: 'No significant news found.',
          marketSentiment: 'Neutral',
          overallSummary: 'No strong fundamental signals detected at this time.'
      };
    } catch (error) {
      console.warn('Failed to get fundamental analysis:', error);
      return { 
          regulatoryNews: 'Error retrieving data.',
          institutionalAdoption: 'Error retrieving data.',
          marketSentiment: 'Unknown',
          overallSummary: 'Unable to retrieve fundamental analysis at this time.'
      };
    }
  }
);
