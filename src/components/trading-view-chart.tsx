"use client";

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
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

interface TradingViewChartProps {
  symbol: string;
  timeframe: string;
}

// Binance API returns data in this format:
// [ openTime, open, high, low, close, volume, closeTime, ... ]
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

export const TradingViewChart = forwardRef<TradingViewChartRef, TradingViewChartProps>(
  ({ symbol, timeframe }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const setDarkMode = useCallback(() => {
        chartRef.current?.applyOptions({
        layout: {
            textColor: '#D1D5DB',
        },
        });
    }, []);
    
    const setLightMode = useCallback(() => {
        chartRef.current?.applyOptions({
        layout: {
            textColor: '#1F2937',
        },
        });
    }, []);

    useEffect(() => {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.attributeName === 'class' && mutation.target.nodeName === 'BODY') {
                  const isDark = (mutation.target as HTMLElement).classList.contains('dark');
                  if (isDark) {
                    setDarkMode();
                  } else {
                    setLightMode();
                  }
              }
          });
      });

      observer.observe(document.body, { attributes: true });

      // Initial check
      if (document.body.classList.contains('dark')) {
          setDarkMode();
      } else {
          setLightMode();
      }

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
        height: 450,
        timeScale: {
          borderColor: 'rgba(197, 203, 206, 0.4)',
        },
        rightPriceScale: {
          borderColor: 'rgba(197, 203, 206, 0.4)',
        },
      });
  
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#3366FF',
        downColor: '#EF4444',
        borderDownColor: '#EF4444',
        borderUpColor: '#3366FF',
        wickDownColor: '#EF4444',
        wickUpColor: '#3366FF',
      });
  
      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
  
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.resize(chartContainerRef.current.clientWidth, 450);
        }
      };
      
      window.addEventListener("resize", handleResize);
  
      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    }, []);
  
    useEffect(() => {
      if (!seriesRef.current) return;
  
      setLoading(true);
      setError(null);
      const fetchData = async () => {
        try {
          const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=150`
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
          }
          const data: BinanceKlineData[] = await response.json();
          const formattedData = formatBinanceData(data);
          seriesRef.current?.setData(formattedData);
          chartRef.current?.timeScale().fitContent();
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, [symbol, timeframe]);
  
    useImperativeHandle(ref, () => ({
      takeScreenshot: async (): Promise<string> => {
        if (!chartRef.current) {
          throw new Error("Chart not initialized");
        }
        const canvas = await chartRef.current.takeScreenshot();
        return canvas.toDataURL("image/png");
      },
    }));

    return (
        <div className="w-full h-[450px] relative">
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
