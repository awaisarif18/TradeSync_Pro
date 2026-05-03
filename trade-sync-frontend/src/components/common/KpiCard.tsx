"use client";

import { useState, type ReactNode } from "react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  valueColor?: "default" | "mint" | "danger" | "violet";
  loading?: boolean;
}

const VALUE_COLORS = {
  default: "var(--color-text)",
  mint: "var(--color-mint)",
  danger: "var(--color-danger)",
  violet: "var(--color-violet)",
} as const;

export function KpiCard({
  title,
  value,
  subtext,
  icon,
  valueColor = "default",
  loading = false,
}: KpiCardProps) {
  const [hovered, setHovered] = useState(false);

  if (loading) {
    return (
      <div
        className="flex flex-col gap-3 rounded-[12px] border border-solid bg-[var(--color-surface)] p-5"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div className="flex gap-3">
          <div
            className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-[rgba(255,255,255,0.08)]"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div
              className="h-2.5 w-[60%] animate-pulse rounded bg-[rgba(255,255,255,0.08)]"
              aria-hidden
            />
            <div
              className="h-6 w-1/2 animate-pulse rounded bg-[rgba(255,255,255,0.08)]"
              aria-hidden
            />
            <div
              className="h-2.5 w-[80%] animate-pulse rounded bg-[rgba(255,255,255,0.08)]"
              aria-hidden
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex cursor-default flex-col gap-3 rounded-[12px] border border-solid bg-[var(--color-surface)] p-5 transition-all duration-300 ease-in-out"
      style={{
        borderColor: hovered ? "var(--color-mint)" : "var(--color-line)",
        boxShadow: hovered ? "0 4px 20px rgba(0,195,137,0.10)" : "none",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-2)] transition-[background,color] duration-300 ease-in-out group-hover:bg-[var(--color-mint-soft)] group-hover:text-[var(--color-mint)]">
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--color-text-3)]">
            {title}
          </div>
          <div
            className="font-mono-tnum text-2xl font-bold leading-none"
            style={{ color: VALUE_COLORS[valueColor] }}
          >
            {value}
          </div>
          {subtext ? (
            <div className="text-xs leading-snug text-[var(--color-text-2)]">
              {subtext}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
