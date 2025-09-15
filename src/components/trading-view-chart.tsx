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
} from "react";

// Generate some random initial data
const generateInitialData = (): CandlestickData[] => {
  const data: CandlestickData[] = [];
  let time = 1640995200 as UTCTimestamp; // Jan 1, 2022
  let lastClose = 100;

  for (let i = 0; i < 150; i++) {
    const open = lastClose + (Math.random() - 0.5) * 5;
    const high = Math.max(open, lastClose) + Math.random() * 5;
    const low = Math.min(open, lastClose) - Math.random() * 5;
    const close = (open + high + low) / 3 + (Math.random() - 0.5) * 5;
    data.push({ time, open, high, low, close });
    lastClose = close;
    time = (time + 24 * 60 * 60) as UTCTimestamp; // Add one day
  }
  return data;
};

export interface TradingViewChartRef {
  takeScreenshot: () => Promise<string>;
}

export const TradingViewChart = forwardRef<TradingViewChartRef, {}>((props, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#FFFFFF00" }, // Transparent background
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

    candlestickSeries.setData(generateInitialData());
    chart.timeScale().fitContent();

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

  useImperativeHandle(ref, () => ({
    takeScreenshot: async (): Promise<string> => {
      if (!chartRef.current) {
        throw new Error("Chart not initialized");
      }
      const canvas = await chartRef.current.takeScreenshot();
      return canvas.toDataURL("image/png");
    },
  }));
  
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


  return <div ref={chartContainerRef} className="w-full h-[450px]" />;
});

TradingViewChart.displayName = "TradingViewChart";
