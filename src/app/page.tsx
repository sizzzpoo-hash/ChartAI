"use client";

import React, { useRef, useState } from "react";
import { BrainCircuit, BotMessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradingViewChart, type TradingViewChartRef } from "@/components/trading-view-chart";
import { getAnalysis } from "@/app/actions";
import { useAnalysisHistory } from "@/lib/hooks/use-analysis-history";
import type { AnalysisResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import AnalysisDisplay from "@/components/analysis-display";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const chartRef = useRef<TradingViewChartRef>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { addAnalysis } = useAnalysisHistory();
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!chartRef.current) return;

    setIsLoading(true);
    setAnalysis(null);

    try {
      const chartDataUri = await chartRef.current.takeScreenshot();
      const result = await getAnalysis(chartDataUri);

      if (result.success && result.data) {
        const newAnalysis: AnalysisResult = {
          id: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          analysis: result.data,
          chartImage: chartDataUri,
        };
        setAnalysis(newAnalysis);
        addAnalysis(newAnalysis);
      } else {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: result.error || "An unknown error occurred.",
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        variant: "destructive",
        title: "Analysis Error",
        description: "Could not analyze the chart. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">AI Chart Analysis</h1>
        <p className="text-muted-foreground">
          Let our AI analyze the chart and provide you with a trade signal.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
            <TradingViewChart ref={chartRef} />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={handleAnalyze} disabled={isLoading} size="lg">
          <BrainCircuit className="mr-2 h-5 w-5" />
          {isLoading ? "Analyzing..." : "Analyze Chart"}
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BotMessageSquare className="mr-2" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
             <div className="flex items-center font-semibold mt-4">
                <Sparkles className="mr-2 text-primary" />
                Trade Signal
            </div>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {analysis && <AnalysisDisplay result={analysis} />}
    </div>
  );
}
