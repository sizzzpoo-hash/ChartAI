
"use client";

import React, { useRef, useState, useEffect } from "react";
import { BrainCircuit, BotMessageSquare, ChevronsUpDown } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { useAiPreferences } from "@/lib/hooks/use-ai-preferences";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const timeframes = [
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
];

const multiTimeframeOptions = [
  { id: "1d", label: "1 Day" },
  { id: "4h", label: "4 Hours" },
  { id: "1h", label: "1 Hour" },
];

const indicatorsOptions = [
  { value: "all", label: "All Indicators" },
  { value: "sma", label: "SMA (20)" },
  { value: "rsi", label: "RSI (14)" },
  { value: "macd", label: "MACD" },
  { value: "bb", label: "Bollinger Bands" },
];

export default function Home() {
  const chartRef = useRef<TradingViewChartRef>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [symbols, setSymbols] = useState<{ value: string; label: string }[]>([]);
  const [isSymbolsLoading, setIsSymbolsLoading] = useState(true);
  const [primaryTimeframe, setPrimaryTimeframe] = useState("4h");
  const [indicator, setIndicator] = useState("all");
  const [includeFundamentals, setIncludeFundamentals] = useState(true);
  const [additionalTimeframes, setAdditionalTimeframes] = useState<string[]>(["1d", "1h"]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  const { addAnalysis } = useAnalysisHistory();
  const { preferences } = useAiPreferences();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
        if (!response.ok) {
          throw new Error('Failed to fetch symbols');
        }
        const data = await response.json();
        const perpetualSymbols = data.symbols
          .filter((s: any) => s.contractType === 'PERPETUAL' && s.status === 'TRADING' && s.quoteAsset === 'USDT')
          .map((s: any) => ({
            value: s.symbol,
            label: `${s.baseAsset}/${s.quoteAsset}`,
          }));
        setSymbols(perpetualSymbols);
      } catch (error) {
        console.error("Error fetching symbols:", error);
        toast({
          variant: "destructive",
          title: "Failed to load symbols",
          description: "Could not fetch the list of trading pairs from Binance. Please refresh the page.",
        });
        // Fallback to a default list
        setSymbols([{ value: 'BTCUSDT', label: 'BTC/USDT' }]);
      } finally {
        setIsSymbolsLoading(false);
      }
    };

    fetchSymbols();
  }, [toast]);

  const handleAnalyze = async () => {
    if (!chartRef.current) return;

    setIsLoading(true);
    setAnalysis(null);

    try {
      // Capture data for the primary timeframe
      const primaryChartDataUri = await chartRef.current.takeScreenshot();
      const ohlcData = JSON.stringify(chartRef.current.getChartData());
      const indicatorData = JSON.stringify(chartRef.current.getIndicatorData());

      const multiTimeframeData: { [key: string]: string } = {};

      // Capture screenshots for additional timeframes
      for (const tf of additionalTimeframes) {
        if (tf !== primaryTimeframe) {
          const dataUri = await chartRef.current.getTimeframeData(tf, getIndicatorFlags());
          multiTimeframeData[`chartDataUri_${tf.replace(/\s+/g, '')}`] = dataUri;
        }
      }

      const result = await getAnalysis(
        primaryChartDataUri,
        ohlcData,
        indicatorData,
        preferences,
        includeFundamentals ? symbol : undefined,
        multiTimeframeData
      );

      if (result.success && result.data) {
        const newAnalysis: Omit<AnalysisResult, "id"> = {
          timestamp: new Date().toISOString(),
          analysis: result.data,
          chartImage: primaryChartDataUri,
        };
        await addAnalysis(newAnalysis);
        setAnalysis({ ...newAnalysis, id: new Date().toISOString() });
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
  
  const getIndicatorFlags = () => {
    return {
      sma: indicator === 'all' || indicator === 'sma',
      rsi: indicator === 'all' || indicator === 'rsi',
      macd: indicator === 'all' || indicator === 'macd',
      bb: indicator === 'all' || indicator === 'bb',
    }
  }

  const handleTimeframeCheckbox = (timeframeId: string, checked: boolean) => {
    setAdditionalTimeframes(prev => {
      if (checked) {
        return [...prev, timeframeId];
      } else {
        return prev.filter(tf => tf !== timeframeId);
      }
    });
  };
  
  const currentSymbolLabel = symbols.find(s => s.value === symbol)?.label || "Select symbol...";

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
               <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full sm:w-[180px] justify-between"
                    disabled={isSymbolsLoading}
                  >
                    <span className="truncate">
                      {isSymbolsLoading ? "Loading symbols..." : currentSymbolLabel}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search symbol..." />
                    <CommandList>
                      <CommandEmpty>No symbol found.</CommandEmpty>
                      <CommandGroup>
                        {symbols.map((s) => (
                          <CommandItem
                            key={s.value}
                            value={s.value}
                            onSelect={(currentValue) => {
                              setSymbol(currentValue === symbol ? symbol : currentValue);
                              setComboboxOpen(false);
                            }}
                          >
                            {s.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
             <div className="grid gap-1.5 w-full sm:w-auto">
              <Label htmlFor="timeframe-select">Primary Timeframe</Label>
              <Select value={primaryTimeframe} onValueChange={setPrimaryTimeframe}>
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
             <div className="grid gap-1.5 w-full sm:w-auto">
              <Label htmlFor="indicator-select">Indicator</Label>
              <Select value={indicator} onValueChange={setIndicator}>
                <SelectTrigger id="indicator-select" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select indicator" />
                </SelectTrigger>
                <SelectContent>
                  {indicatorsOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4 border-b flex flex-wrap gap-x-6 gap-y-4 justify-start items-center">
             <div className="flex items-center space-x-2 self-end">
                <Switch 
                  id="fundamentals-switch" 
                  checked={includeFundamentals}
                  onCheckedChange={setIncludeFundamentals}
                />
                <Label htmlFor="fundamentals-switch">Include News Analysis</Label>
            </div>
             <div className="flex items-center gap-4">
               <Label>Additional Timeframes:</Label>
              <div className="flex items-center gap-4">
                {multiTimeframeOptions.map((tf) => (
                  <div key={tf.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tf-${tf.id}`}
                      checked={additionalTimeframes.includes(tf.id)}
                      onCheckedChange={(checked) => handleTimeframeCheckbox(tf.id, !!checked)}
                      disabled={primaryTimeframe === tf.id}
                    />
                    <Label htmlFor={`tf-${tf.id}`} className="font-normal">
                      {tf.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <TradingViewChart 
            ref={chartRef} 
            symbol={symbol} 
            timeframe={primaryTimeframe}
            indicators={getIndicatorFlags()}
            showVolume={true}
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
