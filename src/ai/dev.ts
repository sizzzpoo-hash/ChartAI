import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-chart-and-generate-trade-signal.ts';
import '@/ai/flows/get-fundamental-analysis.ts';
import '@/ai/flows/summarize-analysis.ts';
