"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock3,
  DollarSign,
  History,
  Shield,
  ShieldCheck,
  Trophy,
  TriangleAlert,
  Users,
  XCircle,
} from "lucide-react";
import { MasterProfile, TradeHistoryEntry } from "../../services/api";
import PnLChart from "./PnLChart";

interface MasterProfileCardProps {
  profile: MasterProfile | null;
  history: TradeHistoryEntry[];
  loading: boolean;
  isSubscribed: boolean;
  subscriptionLocked: boolean;
  onSubscribe?: (masterId: string | null) => void;
  onViewHistory?: () => void;
  showActions?: boolean;
  showChart?: boolean;
}

function splitInstruments(instruments: string | null) {
  if (!instruments) return [];
  return instruments
    .split(",")
    .map((instrument) => instrument.trim())
    .filter(Boolean);
}

function riskVariant(riskLevel: string | null) {
  if (riskLevel === "LOW") {
    return {
      label: "LOW",
      className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
      icon: ShieldCheck,
    };
  }

  if (riskLevel === "HIGH") {
    return {
      label: "HIGH",
      className: "border-red-500/30 bg-red-500/15 text-red-300",
      icon: TriangleAlert,
    };
  }

  return {
    label: "MEDIUM",
    className: "border-yellow-500/30 bg-yellow-500/15 text-yellow-200",
    icon: Shield,
  };
}

function MasterProfileSkeleton({
  showActions = true,
  showChart = true,
}: {
  showActions?: boolean;
  showChart?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-2xl bg-slate-800" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-44 rounded bg-slate-800" />
          <div className="h-3 w-32 rounded bg-slate-800" />
          <div className="h-3 w-full rounded bg-slate-800" />
          <div className="h-3 w-2/3 rounded bg-slate-800" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="h-16 rounded-xl bg-slate-800" />
        <div className="h-16 rounded-xl bg-slate-800" />
        <div className="h-16 rounded-xl bg-slate-800" />
        <div className="h-16 rounded-xl bg-slate-800" />
        <div className="h-16 rounded-xl bg-slate-800" />
        <div className="h-16 rounded-xl bg-slate-800" />
      </div>
      {showChart && <div className="mt-5 h-52 rounded-xl bg-slate-800" />}
      {showActions && <div className="mt-5 h-10 rounded-full bg-slate-800" />}
    </div>
  );
}

export default function MasterProfileCard({
  profile,
  history,
  loading,
  isSubscribed,
  subscriptionLocked,
  onSubscribe,
  onViewHistory,
  showActions = true,
  showChart = true,
}: MasterProfileCardProps) {
  if (loading) {
    return (
      <MasterProfileSkeleton showActions={showActions} showChart={showChart} />
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-sm text-slate-400">
        No profile data available.
      </div>
    );
  }

  const risk = riskVariant(profile.riskLevel);
  const instruments = splitInstruments(profile.instruments);
  const setupIncomplete = !profile.bio && !profile.instruments;
  const identitySectionEmpty =
    !profile.bio &&
    !profile.tradingPlatform &&
    !profile.instruments &&
    !profile.strategyDescription &&
    !profile.typicalHoldTime;
  const pnlColor = profile.totalPnL >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_18px_60px_rgba(16,185,129,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h4 className="text-lg font-semibold text-white">
              {profile.fullName}
            </h4>
            {setupIncomplete && (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-500" />
            )}
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${risk.className}`}
          >
            <risk.icon size={12} />
            {risk.label}
          </span>
          {profile.isLive === true && (
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

      <div className="mt-4 space-y-3">
        {identitySectionEmpty ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
            This master hasn&apos;t set up their profile yet.
          </div>
        ) : profile.bio ? (
          <p className="line-clamp-2 text-sm italic text-slate-400">
            {profile.bio}
          </p>
        ) : (
          <p className="text-sm text-slate-400">
            {profile.tradingPlatform
              ? `Active trader on ${profile.tradingPlatform}`
              : "Professional trader"}
          </p>
        )}

        {instruments.length > 0 && (
          <div className="flex flex-wrap gap-2">
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

        {profile.tradingPlatform && (
          <p className="text-sm text-slate-400">
            Platform:{" "}
            <span className="text-slate-200">{profile.tradingPlatform}</span>
          </p>
        )}

        {profile.typicalHoldTime && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Clock3 size={14} />
            Hold:{" "}
            <span className="text-slate-200">{profile.typicalHoldTime}</span>
          </p>
        )}

        {profile.strategyDescription && (
          <p className="text-sm text-slate-400">
            Strategy:{" "}
            <span className="text-slate-200">
              {profile.strategyDescription}
            </span>
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center gap-1 text-slate-400">
            <BarChart3 size={12} />
            Trades
          </div>
          <div className="mt-1 font-semibold text-white">
            {profile.totalTrades}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Users size={12} />
            Subscribers
          </div>
          <div className="mt-1 font-semibold text-white">
            {profile.subscriberCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Activity size={12} />
            Closed
          </div>
          <div className="mt-1 font-semibold text-white">
            {profile.closedTrades}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Trophy size={12} />
            Win Rate
          </div>
          <div className="mt-1 font-semibold text-white">
            {profile.winRate}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center gap-1 text-slate-400">
            <DollarSign size={12} />
            PnL
          </div>
          <div className={`mt-1 font-semibold ${pnlColor}`}>
            ${profile.totalPnL.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock3 size={12} />
            Avg Vol
          </div>
          <div className="mt-1 font-semibold text-white">
            {profile.avgVolume.toFixed(2)}
          </div>
        </div>
      </div>

      {showChart && (
        <div className="mt-5">
          <PnLChart history={history} />
        </div>
      )}

      {showActions && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onViewHistory?.()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            <History size={14} />
            View Trade History
          </button>

          {isSubscribed ? (
            <button
              type="button"
              onClick={() => onSubscribe?.(null)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
            >
              <XCircle size={14} />
              Unsubscribe
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSubscribe?.(profile.id)}
              disabled={subscriptionLocked}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
                subscriptionLocked
                  ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500"
                  : "border border-emerald-500/30 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              }`}
            >
              <ArrowRight size={14} />
              {subscriptionLocked
                ? "Unsubscribe other Master first"
                : "Subscribe"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
