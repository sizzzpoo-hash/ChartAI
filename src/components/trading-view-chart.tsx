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
  Pane,
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
    let gains = 0;
    let losses = 0;
    const rsiData: LineData[] = [];

    for (let i = 1; i < data.length; i++) {
        const change = data[i].close - data[i-1].close;
        if (i <= period) {
            if (change > 0) gains += change;
            else losses -= change;
        } else {
            if (change > 0) {
                gains = (gains * (period - 1) + change) / period;
                losses = (losses * (period - 1)) / period;
            } else {
                gains = (gains * (period - 1)) / period;
                losses = (losses * (period - 1) - change) / period;
            }
        }
        if (i >= period) {
            const rs = losses === 0 ? 100 : gains / losses;
            const rsi = 100 - (100 / (1 + rs));
            rsiData.push({ time: data[i].time, value: rsi });
        }
    }
    return rsiData;
};

const calculateEMA = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
        emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
};

const calculateMACD = (data: CandlestickData[], fast: number, slow: number, signal: number) => {
    const closes = data.map(d => d.close);
    const emaFast = calculateEMA(closes, fast);
    const emaSlow = calculateEMA(closes, slow);
    
    const macdLine: LineData[] = [];
    const signalLine: LineData[] = [];
    const histogram: HistogramData[] = [];
    
    const macdValues = emaSlow.map((slowVal, i) => i < closes.length - emaFast.length ? null : emaFast[i - (closes.length - emaFast.length)] - slowVal).filter(v => v !== null) as number[];
    const signalValues = calculateEMA(macdValues, signal);
    
    for (let i = 0; i < macdValues.length; i++) {
        const dataIndex = data.length - macdValues.length + i;
        if (dataIndex < data.length) {
            const time = data[dataIndex].time;
            const macdValue = macdValues[i];
            const signalValue = signalValues[i];
            const histValue = macdValue - signalValue;
            macdLine.push({ time, value: macdValue });
            signalLine.push({ time, value: signalValue });
            histogram.push({ time, value: histValue, color: histValue >= 0 ? 'rgba(0, 150, 136, 0.5)' : 'rgba(255, 82, 82, 0.5)' });
        }
    }
    return { macdLine, signalLine, histogram };
};

export const TradingViewChart = forwardRef<TradingViewChartRef, TradingViewChartProps>(
  ({ symbol, timeframe, indicators }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    
    const seriesRef = useRef<{
        candlestick?: ISeriesApi<"Candlestick">;
        sma?: ISeriesApi<"Line">;
        rsi?: ISeriesApi<"Line">;
        macdLine?: ISeriesApi<"Line">;
        macdSignal?: ISeriesApi<"Line">;
        macdHist?: ISeriesApi<"Histogram">;
    }>({});

    const panesRef = useRef<{ rsi?: Pane, macd?: Pane }>({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<CandlestickData[]>([]);

    const setDarkMode = useCallback(() => {
      chartRef.current?.applyOptions({ layout: { textColor: '#D1D5DB' } });
    }, []);

    const setLightMode = useCallback(() => {
      chartRef.current?.applyOptions({ layout: { textColor: '#1F2937' } });
    }, []);

    useEffect(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class' && mutation.target.nodeName === 'BODY') {
            const isDark = (mutation.target as HTMLElement).classList.contains('dark');
            if (isDark) setDarkMode(); else setLightMode();
          }
        });
      });
      observer.observe(document.body, { attributes: true });
      if (document.body.classList.contains('dark')) setDarkMode(); else setLightMode();
      return () => observer.disconnect();
    }, [setDarkMode, setLightMode]);

    useEffect(() => {
      if (!chartContainerRef.current) return;

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: document.body.classList.contains('dark') ? "#D1D5DB" : "#1F2937",
        },
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
    }, []);

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

        // Clear existing indicator series
        Object.entries(seriesRef.current).forEach(([key, series]) => {
          if (key !== 'candlestick') {
            chartRef.current?.removeSeries(series as ISeriesApi<any>);
            delete seriesRef.current[key as keyof typeof seriesRef.current];
          }
        });
        
        seriesRef.current.candlestick?.setData(chartData);

        // SMA
        if (indicators.sma) {
          seriesRef.current.sma = chartRef.current.addLineSeries({ color: 'orange', lineWidth: 2, priceScaleId: 'right' });
          seriesRef.current.sma.setData(calculateSMA(chartData, 20));
        }

        // RSI
        if (panesRef.current.rsi) chartRef.current.removePane(panesRef.current.rsi);
        if (indicators.rsi) {
          panesRef.current.rsi = chartRef.current.addPane({
            height: 100,
            overlay: false,
          });
          seriesRef.current.rsi = chartRef.current.addLineSeries({ color: 'purple', lineWidth: 2, pane: panesRef.current.rsi });
          seriesRef.current.rsi.setData(calculateRSI(chartData, 14));
        }

        // MACD
        if (panesRef.current.macd) chartRef.current.removePane(panesRef.current.macd);
        if (indicators.macd) {
            panesRef.current.macd = chartRef.current.addPane({
                height: 150,
                overlay: false,
            });
            const { macdLine, signalLine, histogram } = calculateMACD(chartData, 12, 26, 9);
            seriesRef.current.macdLine = chartRef.current.addLineSeries({ color: 'blue', lineWidth: 2, pane: panesRef.current.macd });
            seriesRef.current.macdLine.setData(macdLine);
            seriesRef.current.macdSignal = chartRef.current.addLineSeries({ color: 'red', lineWidth: 2, pane: panesRef.current.macd });
            seriesRef.current.macdSignal.setData(signalLine);
            seriesRef.current.macdHist = chartRef.current.addHistogramSeries({ pane: panesRef.current.macd });
            seriesRef.current.macdHist.setData(histogram);
        }
        
        chartRef.current.timeScale().fitContent();

    }, [chartData, indicators]);

    useImperativeHandle(ref, () => ({
      takeScreenshot: async (): Promise<string> => {
        if (!chartRef.current) throw new Error("Chart not initialized");
        const canvas = await chartRef.current.takeScreenshot();
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
