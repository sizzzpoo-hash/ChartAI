
"use client";

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineData,
  HistogramData,
  LayoutOptions,
  DeepPartial,
  ChartOptions,
  AreaSeriesPartialOptions,
  CandlestickData,
} from "lightweight-charts";
import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import { Skeleton } from "./ui/skeleton";
import { useTheme } from "@/hooks/use-theme";

interface IndicatorData {
    sma?: LineData[];
    rsi?: LineData[];
    macd?: {
        macdLine: LineData[];
        signalLine: LineData[];
        histogram: HistogramData[];
    };
    bb?: {
        upper: LineData[];
        middle: LineData[];
        lower: LineData[];
    }
}

export interface CandlestickDataWithVolume extends CandlestickData {
  volume: number;
}

export interface TradingViewChartRef {
  takeScreenshot: () => Promise<string>;
  getChartData: () => CandlestickDataWithVolume[];
  getIndicatorData: () => IndicatorData;
  getTimeframeData: (timeframe: string, indicators: Indicators) => Promise<string>;
}

interface Indicators {
  sma?: boolean;
  rsi?: boolean;
  macd?: boolean;
  bb?: boolean;
}

interface TradingViewChartProps {
  symbol: string;
  timeframe: string;
  indicators: Indicators;
  showVolume: boolean;
}

type BinanceKlineData = [
  number, // Open time
  string, // Open
  string, // High
  string, // Low
  string, // Close
  string, // Volume
  number, // Close time
  ...any[]
];

const formatBinanceData = (data: BinanceKlineData[]): CandlestickDataWithVolume[] => {
  return data.map((item) => ({
    time: (item[0] / 1000) as UTCTimestamp,
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
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

const calculateBollingerBands = (data: CandlestickData[], period: number, stdDev: number) => {
    const upper: LineData[] = [];
    const middle: LineData[] = [];
    const lower: LineData[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, val) => acc + val.close, 0);
        const sma = sum / period;
        
        const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - sma, 2), 0) / period;
        const deviation = Math.sqrt(variance);
        
        upper.push({ time: data[i].time, value: sma + stdDev * deviation });
        middle.push({ time: data[i].time, value: sma });
        lower.push({ time: data[i].time, value: sma - stdDev * deviation });
    }
    return { upper, middle, lower };
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

const getThemeOptions = (theme: string | undefined): DeepPartial<ChartOptions> => ({
  layout: {
    textColor: theme === 'dark' ? '#D1D5DB' : '#1F2937',
    background: { type: ColorType.Solid, color: "transparent" },
  },
  grid: {
    vertLines: { color: 'rgba(197, 203, 206, 0.2)' },
    horzLines: { color: 'rgba(197, 203, 206, 0.2)' },
  },
  timeScale: { borderColor: 'rgba(197, 203, 206, 0.4)' },
  rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.4)' },
});

export const TradingViewChart = forwardRef<TradingViewChartRef, TradingViewChartProps>(
  ({ symbol, timeframe, indicators, showVolume }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const { theme } = useTheme();
    
    const seriesRef = useRef<{
        candlestick?: ISeriesApi<"Candlestick">;
        volume?: ISeriesApi<"Histogram">;
        sma?: ISeriesApi<"Line">;
        bbUpper?: ISeriesApi<"Line">;
        bbMiddle?: ISeriesApi<"Line">;
        bbLower?: ISeriesApi<"Line">;
        bbArea?: ISeriesApi<"Area">;
        rsi?: ISeriesApi<"Line">;
        macdLine?: ISeriesApi<"Line">;
        macdSignal?: ISeriesApi<"Line">;
        macdHist?: ISeriesApi<"Histogram">;
    }>({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<CandlestickDataWithVolume[]>([]);
    const [indicatorData, setIndicatorData] = useState<IndicatorData>({});
    
    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.applyOptions(getThemeOptions(theme));
      }
    }, [theme]);
    
    useEffect(() => {
      if (!chartContainerRef.current) return;

      const chart = createChart(chartContainerRef.current, {
        ...getThemeOptions(theme),
        width: chartContainerRef.current.clientWidth,
        height: 600,
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
      // Clear existing data before fetching new data
      if (seriesRef.current.candlestick) {
        seriesRef.current.candlestick.setData([]);
      }
      setChartData([]);

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
        const newIndicatorData: IndicatorData = {};

        // Clear existing indicator series
        Object.entries(seriesRef.current).forEach(([key, series]) => {
          if (key !== 'candlestick') {
            if (series) chart.removeSeries(series);
            delete seriesRef.current[key as keyof typeof seriesRef.current];
          }
        });
        
        seriesRef.current.candlestick?.setData(chartData);

        let paneIndex = 1;

        // Volume
        if (showVolume) {
          seriesRef.current.volume = chart.addHistogramSeries({
            pane: paneIndex,
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: '',
          });
          const volumeData = chartData.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(0, 150, 136, 0.5)' : 'rgba(255, 82, 82, 0.5)',
          }));
          seriesRef.current.volume.setData(volumeData);
          chart.priceScale('').applyOptions({
            scaleMargins: {
              top: 0.8, // 80% space for volume
              bottom: 0,
            }
          });
          paneIndex++;
        }

        // SMA
        if (indicators.sma) {
          const smaData = calculateSMA(chartData, 20);
          newIndicatorData.sma = smaData;
          seriesRef.current.sma = chart.addLineSeries({ color: 'orange', lineWidth: 2, priceScaleId: 'right' });
          seriesRef.current.sma.setData(smaData);
        }
        
        // Bollinger Bands
        if (indicators.bb) {
          const bbData = calculateBollingerBands(chartData, 20, 2);
          newIndicatorData.bb = bbData;
          
          seriesRef.current.bbUpper = chart.addLineSeries({ color: 'rgba(51, 102, 255, 0.5)', lineWidth: 1 });
          seriesRef.current.bbUpper.setData(bbData.upper);
          seriesRef.current.bbMiddle = chart.addLineSeries({ color: 'rgba(255, 165, 0, 0.8)', lineWidth: 1, lineStyle: 2 });
          seriesRef.current.bbMiddle.setData(bbData.middle);
          seriesRef.current.bbLower = chart.addLineSeries({ color: 'rgba(51, 102, 255, 0.5)', lineWidth: 1 });
          seriesRef.current.bbLower.setData(bbData.lower);
        }

        // RSI
        if (indicators.rsi) {
            const rsiData = calculateRSI(chartData, 14);
            newIndicatorData.rsi = rsiData;
            seriesRef.current.rsi = chart.addLineSeries({ 
                color: 'purple', 
                lineWidth: 2, 
                pane: paneIndex,
            });
            seriesRef.current.rsi.setData(rsiData);
            paneIndex++;
        }

        // MACD
        if (indicators.macd) {
            const macdData = calculateMACD(chartData, 12, 26, 9);
            newIndicatorData.macd = macdData;
            seriesRef.current.macdLine = chart.addLineSeries({ color: 'blue', lineWidth: 2, pane: paneIndex });
            seriesRef.current.macdLine.setData(macdData.macdLine);
            seriesRef.current.macdSignal = chart.addLineSeries({ color: 'red', lineWidth: 2, pane: paneIndex });
            seriesRef.current.macdSignal.setData(macdData.signalLine);
            seriesRef.current.macdHist = chart.addHistogramSeries({ pane: paneIndex });
            seriesRef.current.macdHist.setData(macdData.histogram);
            paneIndex++;
        }
        
        setIndicatorData(newIndicatorData);
        chart.timeScale().fitContent();

    }, [chartData, indicators, showVolume]);

    const getTimeframeData = useCallback(async (newTimeframe: string, newIndicators: Indicators): Promise<string> => {
      // Create a temporary offscreen div for rendering
      const offscreenDiv = document.createElement('div');
      offscreenDiv.style.position = 'absolute';
      offscreenDiv.style.left = '-9999px';
      offscreenDiv.style.width = '800px';
      offscreenDiv.style.height = '450px';
      document.body.appendChild(offscreenDiv);

      const chart = createChart(offscreenDiv, {
        ...getThemeOptions(theme),
        width: 800,
        height: 450,
      });

      try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${newTimeframe}&limit=300`);
        if (!response.ok) throw new Error(`Failed to fetch data for ${newTimeframe}: ${response.statusText}`);
        const data: BinanceKlineData[] = await response.json();
        const formattedData = formatBinanceData(data);

        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#3366FF', downColor: '#EF4444', borderDownColor: '#EF4444',
          borderUpColor: '#3366FF', wickDownColor: '#EF4444', wickUpColor: '#3366FF',
        });
        candlestickSeries.setData(formattedData);
        
        let paneIndex = 1;

        if (showVolume) {
          const volumeSeries = chart.addHistogramSeries({
            pane: paneIndex,
            priceFormat: { type: 'volume' },
          });
          volumeSeries.setData(formattedData.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(0, 150, 136, 0.5)' : 'rgba(255, 82, 82, 0.5)',
          })));
          paneIndex++;
        }

        if (newIndicators.sma) {
          const smaData = calculateSMA(formattedData, 20);
          const smaSeries = chart.addLineSeries({ color: 'orange', lineWidth: 2 });
          smaSeries.setData(smaData);
        }
        if (newIndicators.bb) {
          const bbData = calculateBollingerBands(formattedData, 20, 2);
          const bbUpper = chart.addLineSeries({ color: 'rgba(51, 102, 255, 0.5)', lineWidth: 1 });
          bbUpper.setData(bbData.upper);
          const bbMiddle = chart.addLineSeries({ color: 'rgba(255, 165, 0, 0.8)', lineWidth: 1, lineStyle: 2 });
          bbMiddle.setData(bbData.middle);
          const bbLower = chart.addLineSeries({ color: 'rgba(51, 102, 255, 0.5)', lineWidth: 1 });
          bbLower.setData(bbData.lower);
        }
        if (newIndicators.rsi) {
          const rsiData = calculateRSI(formattedData, 14);
          const rsiSeries = chart.addLineSeries({ color: 'purple', lineWidth: 2, pane: paneIndex });
          rsiSeries.setData(rsiData);
          paneIndex++;
        }
        if (newIndicators.macd) {
          const macdData = calculateMACD(formattedData, 12, 26, 9);
          const macdLineSeries = chart.addLineSeries({ color: 'blue', lineWidth: 2, pane: paneIndex });
          macdLineSeries.setData(macdData.macdLine);
          const macdSignalSeries = chart.addLineSeries({ color: 'red', lineWidth: 2, pane: paneIndex });
          macdSignalSeries.setData(macdData.signalLine);
          const macdHistSeries = chart.addHistogramSeries({ pane: paneIndex });
          macdHistSeries.setData(macdData.histogram);
          paneIndex++;
        }
        
        chart.timeScale().fitContent();

        // Allow a moment for the chart to render before taking a screenshot
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = chart.takeScreenshot();
        return canvas.toDataURL("image/png");
      } finally {
        chart.remove();
        document.body.removeChild(offscreenDiv);
      }
    }, [symbol, theme, showVolume]);
    
    useImperativeHandle(ref, () => ({
      takeScreenshot: async (): Promise<string> => {
        if (!chartRef.current) throw new Error("Chart not initialized");
        const canvas = chartRef.current.takeScreenshot();
        return canvas.toDataURL("image/png");
      },
      getChartData: (): CandlestickDataWithVolume[] => {
        return chartData;
      },
      getIndicatorData: (): IndicatorData => {
        return indicatorData;
      },
      getTimeframeData,
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
