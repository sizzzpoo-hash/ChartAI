"use client";

import { History, Trash2 } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";

import { useAnalysisHistory } from "@/lib/hooks/use-analysis-history";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnalysisDisplay from "@/components/analysis-display";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const { history, clearHistory } = useAnalysisHistory();

  return (
    <div className="flex flex-col gap-8">
       <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Analysis History</h1>
        <p className="text-muted-foreground">
          Review your past AI chart analyses and trade signals.
        </p>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Past Analyses</CardTitle>
          {history.length > 0 && (
             <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear History
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {history.map((item) => (
                <AccordionItem value={item.id} key={item.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4">
                      <History className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        Analysis from {format(new Date(item.timestamp), "PPP p")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 space-y-6">
                     <div className="rounded-lg overflow-hidden border">
                        <Image
                            src={item.chartImage}
                            alt="Candlestick chart analysis"
                            width={800}
                            height={450}
                            className="w-full h-auto"
                        />
                     </div>
                    <AnalysisDisplay result={item} defaultOpen={true} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg">No history yet.</p>
              <p>Your past analyses will appear here after you run them on the main page.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
