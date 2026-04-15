"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  Shield,
  ShieldCheck,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { TopMaster, profileService } from "../../services/api";

const avatarGradients = [
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-indigo-600",
];

function hashToIndex(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % avatarGradients.length;
}

function splitInstruments(instruments: string | null) {
  if (!instruments) return [];
  return instruments
    .split(",")
    .map((instrument) => instrument.trim())
    .filter(Boolean);
}

function riskTheme(level: string | null) {
  if (level === "LOW") {
    return {
      label: "LOW",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
      icon: ShieldCheck,
    };
  }

  if (level === "HIGH") {
    return {
      label: "HIGH",
      className: "border-red-500/40 bg-red-500/15 text-red-300",
      icon: TriangleAlert,
    };
  }

  return {
    label: "MEDIUM",
    className: "border-yellow-500/40 bg-yellow-500/15 text-yellow-200",
    icon: Shield,
  };
}

function TraderSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-2xl bg-slate-800" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="h-3 w-28 rounded bg-slate-800" />
          <div className="h-3 w-full rounded bg-slate-800" />
          <div className="h-3 w-2/3 rounded bg-slate-800" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="h-16 rounded-xl bg-slate-800" />
        <div className="h-16 rounded-xl bg-slate-800" />
        <div className="h-16 rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}

export default function TopTradersSection() {
  const [masters, setMasters] = useState<TopMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopMasters = async () => {
      try {
        const data = await profileService.getTopMasters();
        setMasters(data);
      } catch (error) {
        console.error("Failed to load top masters", error);
        setMasters([]);
      } finally {
        setLoading(false);
      }
    };

    loadTopMasters();
  }, []);

  if (!loading && masters.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 rounded-4xl border border-slate-800/80 bg-linear-to-b from-slate-950/95 to-slate-900/70 p-8 shadow-[0_30px_120px_rgba(2,6,23,0.45)] md:p-10">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400/80">
          Marketplace Spotlight
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Top Performing Traders
        </h2>
        <p className="mt-3 text-sm text-slate-400 md:text-base">
          Join thousands copying professional traders in real-time.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <TraderSkeleton key={index} />
            ))
          : masters.map((master) => {
              const initials = master.fullName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const gradient = avatarGradients[hashToIndex(master.id)];
              const instruments = splitInstruments(master.instruments);
              const risk = riskTheme(master.riskLevel);

              return (
                <article
                  key={master.id}
                  className="group rounded-2xl border border-slate-800 bg-slate-950/85 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_24px_70px_rgba(16,185,129,0.14)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${gradient} text-sm font-bold text-white shadow-lg shadow-slate-950/40`}
                    >
                      {initials}
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${risk.className}`}
                      >
                        <risk.icon size={12} />
                        {risk.label}
                      </span>
                      {master.openTrades > 0 && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                          </span>
                          Live
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-white">
                      {master.fullName}
                    </h3>
                    {master.bio ? (
                      <p className="line-clamp-2 mt-2 text-sm text-slate-400">
                        {master.bio}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        {master.tradingPlatform
                          ? `Active trader on ${master.tradingPlatform}`
                          : "Professional trader"}
                      </p>
                    )}
                  </div>

                  {instruments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {instruments.slice(0, 4).map((instrument) => (
                        <span
                          key={instrument}
                          className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {instrument}
                        </span>
                      ))}
                      {instruments.length > 4 && (
                        <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-400">
                          +{instruments.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <BarChart3 size={12} />
                        Trades
                      </div>
                      <div className="mt-1 font-semibold text-white">
                        {master.totalTrades}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Trophy size={12} />
                        Win Rate
                      </div>
                      <div className="mt-1 font-semibold text-white">
                        {master.winRate}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <DollarSign size={12} />
                        PnL
                      </div>
                      <div
                        className={`mt-1 font-semibold ${
                          master.totalPnL >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        ${master.totalPnL.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{master.subscriberCount} subscribers</span>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-1 font-medium text-emerald-300 transition-colors group-hover:text-emerald-200"
                    >
                      Join to Copy
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </article>
              );
            })}
      </div>

      <div className="mt-8 flex flex-col gap-2 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>Performance data is live and updated in real-time.</p>
        <p>Register free to start copying.</p>
      </div>
    </section>
  );
}
