
"use client";

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  LineData,
  HistogramData,
  LayoutOptions,
} from "lightweight-charts";
import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from "react";
import { Skeleton } from "./ui/skeleton";
import { useTheme } from "@/hooks/use-theme";

export interface TradingViewChartRef {
  takeScreenshot: () => Promise<string>;
}

interface Indicators {
  sma?: boolean;
  rsi?: boolean;
  macd?: boolean;
}

interface TradingViewChartProps {
  symbol: string;
  timeframe: string;
  indicators: Indicators;
}

type BinanceKlineData = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  ...any[]
];

const formatBinanceData = (data: BinanceKlineData[]): CandlestickData[] => {
  return data.map((item) => ({
    time: (item[0] / 1000) as UTCTimestamp,
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
  }));
};

// Indicator calculation functions
const calculateSMA = (data: CandlestickData[], period: number): LineData[] => {
  const result: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
};

const calculateRSI = (data: CandlestickData[], period: number): LineData[] => {
    if (data.length <= period) return [];
    let gains = 0;
    let losses = 0;
    const rsiData: LineData[] = [];

    // First period calculation
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i-1].close;
        if (change > 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }
    gains /= period;
    losses /= period;

    let rs = losses === 0 ? 100 : gains / losses;
    let rsi = 100 - (100 / (1 + rs));
    rsiData.push({ time: data[period].time, value: rsi });

    // Subsequent periods
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i-1].close;
        let currentGain = 0;
        let currentLoss = 0;

        if (change > 0) {
            currentGain = change;
        } else {
            currentLoss = -change;
        }

        gains = (gains * (period - 1) + currentGain) / period;
        losses = (losses * (period - 1) + currentLoss) / period;
        
        rs = losses === 0 ? 100 : gains / losses;
        rsi = 100 - (100 / (1 + rs));
        rsiData.push({ time: data[i].time, value: rsi });
    }
    return rsiData;
};

const calculateEMA = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const emaArray: number[] = [];
    if (data.length > 0) {
        emaArray.push(data[0]);
        for (let i = 1; i < data.length; i++) {
            emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
        }
    }
    return emaArray;
};

const calculateMACD = (data: CandlestickData[], fast: number, slow: number, signal: number) => {
    const closes = data.map(d => d.close);
    if (closes.length < slow) return { macdLine: [], signalLine: [], histogram: [] };

    const emaFast = calculateEMA(closes, fast);
    const emaSlow = calculateEMA(closes, slow);
    
    const macdLine: LineData[] = [];
    const signalLine: LineData[] = [];
    const histogram: HistogramData[] = [];
    
    const macdValues = emaSlow.map((slowVal, i) => {
        const fastIndex = i + (emaFast.length - emaSlow.length);
        return fastIndex >= 0 ? emaFast[fastIndex] - slowVal : null;
    }).filter(v => v !== null) as number[];

    if (macdValues.length === 0) return { macdLine: [], signalLine: [], histogram: [] };

    const signalValues = calculateEMA(macdValues, signal);
    
    const macdStartIndex = data.length - macdValues.length;
    const signalStartIndex = macdValues.length - signalValues.length;

    for (let i = 0; i < signalValues.length; i++) {
        const dataIndex = macdStartIndex + signalStartIndex + i;
        if (dataIndex < data.length) {
            const time = data[dataIndex].time;
            const macdValue = macdValues[signalStartIndex + i];
            const signalValue = signalValues[i];
            const histValue = macdValue - signalValue;
            macdLine.push({ time, value: macdValue });
            signalLine.push({ time, value: signalValue });
            histogram.push({ time, value: histValue, color: histValue >= 0 ? 'rgba(0, 150, 136, 0.5)' : 'rgba(255, 82, 82, 0.5)' });
        }
    }
    return { macdLine, signalLine, histogram };
};

const darkThemeOptions: Partial<LayoutOptions> = {
  textColor: '#D1D5DB',
  background: { type: ColorType.Solid, color: "transparent" },
};

const lightThemeOptions: Partial<LayoutOptions> = {
  textColor: '#1F2937',
  background: { type: ColorType.Solid, color: "transparent" },
};

export const TradingViewChart = forwardRef<TradingViewChartRef, TradingViewChartProps>(
  ({ symbol, timeframe, indicators }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const { theme } = useTheme();
    
    const seriesRef = useRef<{
        candlestick?: ISeriesApi<"Candlestick">;
        sma?: ISeriesApi<"Line">;
        rsi?: ISeriesApi<"Line">;
        macdLine?: ISeriesApi<"Line">;
        macdSignal?: ISeriesApi<"Line">;
        macdHist?: ISeriesApi<"Histogram">;
    }>({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<CandlestickData[]>([]);

    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.applyOptions(theme === 'dark' ? darkThemeOptions : lightThemeOptions);
      }
    }, [theme]);
    
    useEffect(() => {
      if (!chartContainerRef.current) return;

      const chart = createChart(chartContainerRef.current, {
        layout: theme === 'dark' ? darkThemeOptions : lightThemeOptions,
        grid: {
          vertLines: { color: 'rgba(197, 203, 206, 0.2)' },
          horzLines: { color: 'rgba(197, 203, 206, 0.2)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 600,
        timeScale: { borderColor: 'rgba(197, 203, 206, 0.4)' },
        rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.4)' },
      });
      chartRef.current = chart;

      seriesRef.current.candlestick = chart.addCandlestickSeries({
        upColor: '#3366FF', downColor: '#EF4444', borderDownColor: '#EF4444',
        borderUpColor: '#3366FF', wickDownColor: '#EF4444', wickUpColor: '#3366FF',
      });

      const handleResize = () => {
        if (chartContainerRef.current) chart.resize(chartContainerRef.current.clientWidth, 600);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    }, [theme]);

    useEffect(() => {
      setLoading(true);
      setError(null);
      const fetchData = async () => {
        try {
          const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=300`);
          if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
          const data: BinanceKlineData[] = await response.json();
          const formattedData = formatBinanceData(data);
          setChartData(formattedData);
        } catch (err) {
          setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [symbol, timeframe]);

    useEffect(() => {
        if (!chartRef.current || chartData.length === 0) return;
        const chart = chartRef.current;

        // Clear existing indicator series
        Object.entries(seriesRef.current).forEach(([key, series]) => {
          if (key !== 'candlestick') {
            if (series) chart.removeSeries(series);
            delete seriesRef.current[key as keyof typeof seriesRef.current];
          }
        });
        
        seriesRef.current.candlestick?.setData(chartData);

        let paneIndex = 1;

        // SMA
        if (indicators.sma) {
          seriesRef.current.sma = chart.addLineSeries({ color: 'orange', lineWidth: 2, priceScaleId: 'right' });
          seriesRef.current.sma.setData(calculateSMA(chartData, 20));
        }

        // RSI
        if (indicators.rsi) {
            seriesRef.current.rsi = chart.addLineSeries({ 
                color: 'purple', 
                lineWidth: 2, 
                pane: paneIndex,
            });
            seriesRef.current.rsi.setData(calculateRSI(chartData, 14));
            paneIndex++;
        }

        // MACD
        if (indicators.macd) {
            const { macdLine, signalLine, histogram } = calculateMACD(chartData, 12, 26, 9);
            seriesRef.current.macdLine = chart.addLineSeries({ color: 'blue', lineWidth: 2, pane: paneIndex });
            seriesRef.current.macdLine.setData(macdLine);
            seriesRef.current.macdSignal = chart.addLineSeries({ color: 'red', lineWidth: 2, pane: paneIndex });
            seriesRef.current.macdSignal.setData(signalLine);
            seriesRef.current.macdHist = chart.addHistogramSeries({ pane: paneIndex });
            seriesRef.current.macdHist.setData(histogram);
            paneIndex++;
        }
        
        chart.timeScale().fitContent();

    }, [chartData, indicators]);

    useImperativeHandle(ref, () => ({
      takeScreenshot: async (): Promise<string> => {
        if (!chartRef.current) throw new Error("Chart not initialized");
        const canvas = chartRef.current.takeScreenshot();
        return canvas.toDataURL("image/png");
      },
    }));

    return (
      <div className="w-full h-[600px] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 z-10">
            <p className="text-destructive-foreground p-4 bg-destructive rounded-md">{error}</p>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    );
  }
);

TradingViewChart.displayName = "TradingViewChart";
