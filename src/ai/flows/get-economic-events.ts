
'use server';
/**
 * @fileOverview Retrieves and summarizes upcoming major economic events.
 *
 * - getEconomicEvents - A function that fetches economic event data.
 * - GetEconomicEventsInput - The input type for the getEconomicEvents function.
 * - GetEconomicEventsOutput - The return type for the getEconomicEvents function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GetEconomicEventsInputSchema = z.object({
  symbol: z.string().describe('The cryptocurrency symbol to check for related events (e.g., BTCUSDT).'),
});
export type GetEconomicEventsInput = z.infer<typeof GetEconomicEventsInputSchema>;

const GetEconomicEventsOutputSchema = z.object({
  eventSummary: z.string().describe("A summary of major upcoming economic events in the next 48 hours that could impact the asset's price, or a statement that no major events are scheduled."),
});
export type GetEconomicEventsOutput = z.infer<typeof GetEconomicEventsOutputSchema>;

export async function getEconomicEvents(
  input: GetEconomicEventsInput
): Promise<GetEconomicEventsOutput> {
  return getEconomicEventsFlow(input);
}

const getEconomicEventsPrompt = ai.definePrompt({
  name: 'getEconomicEventsPrompt',
  input: { schema: GetEconomicEventsInputSchema },
  output: { schema: GetEconomicEventsOutputSchema },
  prompt: `You are a financial analyst. Your task is to use the search tool to find major, market-moving economic events scheduled for the next 48 hours that could impact the broader financial markets and specifically {{{symbol}}}.

Focus on high-impact events such as:
- Federal Reserve (FOMC) interest rate decisions
- Inflation data releases (CPI, PPI)
- Employment reports (Non-Farm Payrolls)
- GDP announcements
- Major regulatory speeches or hearings related to crypto

Summarize your findings in a single string. If no significant events are found, state "No major economic events are scheduled in the next 48 hours that are likely to impact the market."`,
  tools: [googleAI.googleSearchTool],
  model: 'googleai/gemini-2.5-flash',
});

const getEconomicEventsFlow = ai.defineFlow(
  {
    name: 'getEconomicEventsFlow',
    inputSchema: GetEconomicEventsInputSchema,
    outputSchema: GetEconomicEventsOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await getEconomicEventsPrompt(input);
      return (
        output || {
          eventSummary: 'Could not retrieve economic event data at this time.',
        }
      );
    } catch (error) {
      console.warn('Failed to get economic events:', error);
      return {
        eventSummary: 'Error retrieving economic event data.',
      };
    }
  }
);
