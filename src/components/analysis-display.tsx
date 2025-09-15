import { BotMessageSquare, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResult } from "@/lib/types";

type AnalysisDisplayProps = {
  result: AnalysisResult;
  defaultOpen?: boolean;
};

export default function AnalysisDisplay({ result, defaultOpen = false }: AnalysisDisplayProps) {
  const { analysis } = result;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BotMessageSquare className="mr-2" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible defaultValue={defaultOpen ? "item-1" : undefined}>
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold">
              Analysis Summary
            </AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed pt-2">
              {analysis.analysisSummary}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div>
          <h3 className="flex items-center text-lg font-semibold mb-2">
            <Sparkles className="mr-2 text-primary" />
            Trade Signal
          </h3>
          <div className="p-4 rounded-lg bg-muted/50 border font-code text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="font-semibold text-muted-foreground">Entry Price</p>
                <p className="text-foreground text-base">{analysis.tradeSignal.entryPriceRange}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Take Profit</p>
                <ul className="list-disc list-inside text-foreground text-base">
                  {analysis.tradeSignal.takeProfitLevels.map((level, index) => (
                    <li key={index}>{level}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Stop Loss</p>
                <p className="text-foreground text-base">{analysis.tradeSignal.stopLoss}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
