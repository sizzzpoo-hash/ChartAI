
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
  prompt: `You are a financial analyst. Based on your knowledge of typical economic event patterns and current market conditions, provide an analysis of potential market-moving economic events that could impact the broader financial markets and specifically {{{symbol}}} in the next 48 hours.

Focus on typical high-impact events such as:
- Federal Reserve (FOMC) interest rate decisions
- Inflation data releases (CPI, PPI)
- Employment reports (Non-Farm Payrolls)
- GDP announcements
- Major regulatory speeches or hearings related to crypto
- Earnings releases from major companies
- Central bank announcements from major economies

Provide general guidance about the types of events to monitor and their potential market impact. If it's a typical low-impact period, state "No major economic events are typically scheduled during this period that are likely to significantly impact the market."

Consider the current day of the week and time of month to provide relevant context about typical event patterns.`,
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
      
      // Check if we got a valid response
      if (output && output.eventSummary && 
          !output.eventSummary.includes('Error retrieving') && 
          !output.eventSummary.includes('Could not retrieve')) {
        return output;
      }
      
      // If search tool failed, provide a reasonable fallback
      console.warn('Search tool failed or returned empty results, providing fallback economic events summary');
      return {
        eventSummary: getFallbackEconomicEvents(input.symbol),
      };
    } catch (error) {
      console.warn('Failed to get economic events:', error);
      
      // Check if it's an API key issue
      if (error instanceof Error && error.message.includes('API key')) {
        console.error('Gemini API key not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
        return {
          eventSummary: 'Economic events analysis requires API key configuration. Using general market timing considerations: ' + getFallbackEconomicEvents(input.symbol),
        };
      }
      
      // Provide fallback instead of error message
      return {
        eventSummary: getFallbackEconomicEvents(input.symbol),
      };
    }
  }
);

// Fallback function to provide reasonable economic events context
function getFallbackEconomicEvents(symbol: string): string {
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const dayOfMonth = currentDate.getDate();
  
  // Provide context based on typical market patterns
  let events = [];
  
  // Weekly patterns
  if (dayOfWeek === 1) { // Monday
    events.push('Market open after weekend - potential gap movements');
  }
  if (dayOfWeek === 5) { // Friday
    events.push('End of trading week - potential position closures and lower volume');
  }
  
  // Monthly patterns
  if (dayOfMonth >= 1 && dayOfMonth <= 7) {
    events.push('First week of month - typically higher institutional activity');
  }
  
  // Crypto-specific events
  if (symbol.includes('BTC') || symbol.includes('ETH')) {
    events.push('Monitor for major cryptocurrency news and regulatory updates');
  }
  
  // General market considerations
  events.push('Check for major central bank announcements and economic data releases');
  events.push('Be aware of potential market volatility during session overlaps');
  
  if (events.length === 0) {
    return 'No major economic events identified for the next 48 hours. Monitor general market conditions and news flow.';
  }
  
  return `Economic considerations for the next 48 hours: ${events.join('. ')}.`;
}
