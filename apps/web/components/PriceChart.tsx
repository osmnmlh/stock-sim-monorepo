"use client";

import { createChart, ISeriesApi } from "lightweight-charts";
import { useEffect, useRef } from "react";

type Row = { ts: string; o: number; h: number; l: number; c: number; v?: number | null };

export default function PriceChart({ rows, height = 360 }: { rows: Row[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: { fontSize: 12 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair: { mode: 0 },
    });
    const series = chart.addCandlestickSeries();
    seriesRef.current = series;
    chartRef.current = chart;

    const data = rows.map(r => ({
      time: (new Date(r.ts).getTime() / 1000) as any,
      open: Number(r.o),
      high: Number(r.h),
      low: Number(r.l),
      close: Number(r.c),
    }));
    series.setData(data);
    chart.timeScale().fitContent();

    const onResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [rows, height]);

  return <div ref={containerRef} className="w-full" />;
}
