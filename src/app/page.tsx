"use client";

import React, { useRef, useState } from "react";
import { BrainCircuit, BotMessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TradingViewChart, type TradingViewChartRef } from "@/components/trading-view-chart";
import { getAnalysis } from "@/app/actions";
import { useAnalysisHistory } from "@/lib/hooks/use-analysis-history";
import type { AnalysisResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import AnalysisDisplay from "@/components/analysis-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAiPreferences } from "@/lib/hooks/use-ai-preferences";

const timeframes = [
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
];

const symbols = [
  { value: "BTCUSDT", label: "BTC/USDT" },
  { value: "ETHUSDT", label: "ETH/USDT" },
  { value: "SOLUSDT", label: "SOL/USDT" },
  { value: "XRPUSDT", label: "XRP/USDT" },
  { value: "DOGEUSDT", label: "DOGE/USDT" },
];

export default function Home() {
  const chartRef = useRef<TradingViewChartRef>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1d");
  const [showSMA, setShowSMA] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const { addAnalysis } = useAnalysisHistory();
  const { preferences } = useAiPreferences();
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!chartRef.current) return;

    setIsLoading(true);
    setAnalysis(null);

    try {
      const chartDataUri = await chartRef.current.takeScreenshot();
      const ohlcData = JSON.stringify(chartRef.current.getChartData());
      const indicatorData = JSON.stringify(chartRef.current.getIndicatorData());
      const result = await getAnalysis(chartDataUri, ohlcData, indicatorData, preferences);

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
        description: "An unexpected error occurred while analyzing the chart. Please check the console for details and try again.",
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
          <div className="p-4 border-b flex flex-wrap gap-4 justify-start items-center">
            <div className="grid gap-1.5 w-full sm:w-auto">
              <Label htmlFor="symbol-select">Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger id="symbol-select" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 w-full sm:w-auto">
              <Label htmlFor="timeframe-select">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger id="timeframe-select" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator orientation="vertical" className="h-10 hidden sm:block" />
             <div className="flex flex-wrap gap-4 sm:gap-6 items-center">
                <div className="flex items-center space-x-2">
                    <Switch id="sma-switch" checked={showSMA} onCheckedChange={setShowSMA} />
                    <Label htmlFor="sma-switch">SMA (20)</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="rsi-switch" checked={showRSI} onCheckedChange={setShowRSI} />
                    <Label htmlFor="rsi-switch">RSI (14)</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="macd-switch" checked={showMACD} onCheckedChange={setShowMACD} />
                    <Label htmlFor="macd-switch">MACD</Label>
                </div>
            </div>
          </div>
          <TradingViewChart 
            ref={chartRef} 
            symbol={symbol} 
            timeframe={timeframe}
            indicators={{ sma: showSMA, rsi: showRSI, macd: showMACD }}
          />
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
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <BotMessageSquare className="w-8 h-8 text-primary" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && <AnalysisDisplay result={analysis} />}
    </div>
  );
}
