"use client";

import { useMemo, useState } from "react";

type ChartSeries = {
  label: string;
  values: number[];
};

type OverviewChartProps = {
  series: ChartSeries[];
  days: string[];
};

const MAX_SERIES = 5;
const SERIES_COLORS = [
  "bg-red-500/70 border-red-400/70",
  "bg-amber-400/70 border-amber-300/70",
  "bg-emerald-400/70 border-emerald-300/70",
  "bg-sky-400/70 border-sky-300/70",
  "bg-violet-400/70 border-violet-300/70",
];

export default function OverviewChart({ series, days }: OverviewChartProps) {
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const trimmedSeries = series.slice(0, MAX_SERIES);
  const totalsByDay = useMemo(() => {
    return days.map((_, dayIndex) =>
      trimmedSeries.reduce(
        (sum, current) => sum + (current.values[dayIndex] ?? 0),
        0
      )
    );
  }, [days, trimmedSeries]);

  const maxValue = Math.max(
    1,
    ...trimmedSeries.flatMap((item) => item.values)
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/40 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between text-sm text-zinc-300">
        <span className="font-semibold">Weekly Sharing Summary</span>
      </div>

      <div className="mt-6 space-y-5">
        <div className="relative h-48">
          <div className="absolute inset-0 grid grid-cols-7 gap-3">
            {totalsByDay.map((total, index) => {
              const isActive = activeDay === index;
              return (
                <div
                  key={days[index]}
                  className="relative flex items-end justify-center gap-2"
                  onMouseEnter={() => setActiveDay(index)}
                  onMouseLeave={() => setActiveDay(null)}
                >
                  {trimmedSeries.map((item, seriesIndex) => {
                    const value = item.values[index] ?? 0;
                    const height = Math.max(
                      value === 0 ? 6 : 12,
                      (value / maxValue) * 100
                    );
                    const color =
                      SERIES_COLORS[seriesIndex] ??
                      "bg-zinc-700/70 border-zinc-600/70";
                    return (
                      <div
                        key={`${item.label}-${index}`}
                        className={`w-3 rounded-full border ${color} transition ${
                          isActive ? "opacity-100" : "opacity-80"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                  {isActive && (
                    <div className="absolute -top-12 left-1/2 w-44 -translate-x-1/2 rounded-xl border border-zinc-700 bg-black/95 p-3 text-xs text-zinc-200 shadow-xl">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {days[index]}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {total} shares
                      </div>
                      <div className="mt-2 space-y-1 text-[11px] text-zinc-400">
                        {trimmedSeries.map((item, seriesIndex) => (
                          <div
                            key={`${item.label}-${index}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  SERIES_COLORS[seriesIndex] ??
                                  "bg-zinc-600"
                                }`}
                              />
                              {item.label}
                            </span>
                            <span className="text-zinc-300">
                              {item.values[index] ?? 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3 text-center text-[11px] uppercase tracking-[0.35em] text-zinc-500">
          {days.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          {trimmedSeries.length === 0 && (
            <span>No destinations yet.</span>
          )}
          {trimmedSeries.map((item, seriesIndex) => (
            <span
              key={item.label}
              className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  SERIES_COLORS[seriesIndex] ?? "bg-zinc-600"
                }`}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
