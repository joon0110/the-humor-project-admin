"use client";

import { useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{ key: ThemeMode; label: string }> = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <circle cx="12" cy="12" r="4.25" />
        <path strokeLinecap="round" d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M5.9 5.9l1.8 1.8M16.3 16.3l1.8 1.8M18.1 5.9l-1.8 1.8M7.7 16.3l-1.8 1.8" />
      </svg>
    );
  }

  if (mode === "dark") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3.75" y="5" width="16.5" height="11.5" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 19h5M12 16.5V19" />
    </svg>
  );
}

export default function ThemeMenu() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>("dark");

  return (
    <div className="rounded-[28px] border border-zinc-800 bg-zinc-950 px-5 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
        Theme
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        {THEME_OPTIONS.map((option) => {
          const isSelected = option.key === selectedTheme;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedTheme(option.key)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border p-0 transition ${
                isSelected
                  ? "border-zinc-600 bg-zinc-900 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900"
              }`}
              aria-label={`${option.label} theme`}
              title={option.label}
            >
              <ThemeIcon mode={option.key} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
