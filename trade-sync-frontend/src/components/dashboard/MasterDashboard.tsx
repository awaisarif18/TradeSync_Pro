"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  Copy,
  DollarSign,
  LineChart,
  ListChecks,
  Users,
} from "lucide-react";
import { useSelector } from "react-redux";
import Card from "../common/Card";
import {
  MasterDashboardData,
  MasterProfile,
  profileService,
} from "../../services/api";
import { RootState } from "../../redux/slices/store";
import MasterProfileSetup from "./MasterProfileSetup";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function getPnLClass(value: number) {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-slate-300";
}

function getPnLValueClass(value: number | null) {
  if (value === null) return "text-slate-400";
  return getPnLClass(value);
}

function statusPillClass(status: "OPEN" | "CLOSED") {
  return status === "OPEN"
    ? "border border-yellow-500/30 bg-yellow-500/15 text-yellow-200"
    : "border border-slate-700 bg-slate-800 text-slate-200";
}

function riskBadgeClass(riskLevel: string | null) {
  if (riskLevel === "LOW") {
    return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }

  if (riskLevel === "HIGH") {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }

  return "border border-yellow-500/30 bg-yellow-500/15 text-yellow-200";
}

export default function MasterDashboard() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [dashboardData, setDashboardData] =
    useState<MasterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "profile-setup">(
    "overview",
  );
  const [error, setError] = useState<string | null>(null);
  const [licenseCopied, setLicenseCopied] = useState(false);

  useEffect(() => {
    const masterId = user?.id;

    if (!masterId || user?.role !== "MASTER") {
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      try {
        const data = await profileService.getMasterDashboard(masterId);
        setDashboardData(data);
      } catch (loadError) {
        console.error("Failed to load master dashboard", loadError);
        setError("Failed to load your master dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  if (!user || user.role !== "MASTER") {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 rounded bg-slate-800" />
          <div className="h-7 w-32 rounded-full bg-slate-800" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-slate-900/70" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-slate-900/70" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const profile = dashboardData.profile;
  const statusLabel = dashboardData.openTrades > 0 ? "BROADCASTING" : "IDLE";
  const statusClass =
    dashboardData.openTrades > 0
      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
      : "border border-slate-600/40 bg-slate-800/70 text-slate-300";

  const handleProfileSaved = (updatedProfile: MasterProfile) => {
    setDashboardData((current) =>
      current
        ? {
            ...current,
            profile: updatedProfile,
          }
        : current,
    );
    setActiveTab("overview");
  };

  const handleCopyLicenseKey = async () => {
    if (!user.licenseKey) return;

    try {
      await navigator.clipboard.writeText(user.licenseKey);
      setLicenseCopied(true);
    } catch (copyError) {
      console.error("Failed to copy license key", copyError);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
            Master Console
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Master Performance Dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Review your results, refine your identity, and publish a stronger
            public profile.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${statusClass}`}
        >
          STATUS: {statusLabel}
        </span>
      </div>

      <div className="flex gap-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "overview"
              ? "border-emerald-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profile-setup")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "profile-setup"
              ? "border-emerald-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Profile Setup
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Your License Key
                </p>
                {user.licenseKey ? (
                  <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 font-mono text-sm text-emerald-300">
                    {user.licenseKey}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No license key — contact admin
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyLicenseKey}
                disabled={!user.licenseKey}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  user.licenseKey
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
                }`}
              >
                <Copy size={14} />
                {licenseCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card
              title="Total Signals Sent"
              value={String(dashboardData.totalSignalsSent)}
              icon={Activity}
              color="blue"
            />
            <Card
              title="Connected Subscribers"
              value={String(dashboardData.subscriberCount)}
              icon={Users}
              color="emerald"
            />
            <Card
              title="Open Trades"
              value={String(dashboardData.openTrades)}
              icon={ListChecks}
              color="yellow"
            />
            <Card
              title="Win Rate"
              value={`${dashboardData.profile.winRate.toFixed(2)}%`}
              icon={BarChart3}
              color="purple"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">My Performance</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                  <DollarSign size={12} />
                  Total PnL
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${getPnLClass(dashboardData.profile.totalPnL)}`}
                >
                  ${dashboardData.profile.totalPnL.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                  <LineChart size={12} />
                  Avg Volume
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {dashboardData.profile.avgVolume.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                  <Clock3 size={12} />
                  Closed Trades
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {dashboardData.profile.closedTrades}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">
                Recent Signal History
              </h3>
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Last 10 trades
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              {dashboardData.recentTrades.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
                  No trades broadcast yet. Connect your MT5 and start
                  broadcasting.
                </div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 pr-4">Symbol</th>
                      <th className="py-3 pr-4">Action</th>
                      <th className="py-3 pr-4">Volume</th>
                      <th className="py-3 pr-4">PnL</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentTrades.map((trade) => (
                      <tr
                        key={trade.id}
                        className="border-b border-slate-900 text-slate-200"
                      >
                        <td className="py-3 pr-4 font-medium text-white">
                          {trade.symbol}
                        </td>
                        <td
                          className={`py-3 pr-4 font-semibold ${
                            trade.action === "BUY"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {trade.action}
                        </td>
                        <td className="py-3 pr-4">{trade.volume}</td>
                        <td
                          className={`py-3 pr-4 font-semibold ${getPnLValueClass(trade.pnl)}`}
                        >
                          {trade.pnl === null ? "-" : trade.pnl.toFixed(2)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(trade.status)}`}
                          >
                            {trade.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {formatTime(trade.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Your Public Profile
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Preview the profile card slaves will see in the marketplace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("profile-setup")}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
              >
                Edit Profile
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xl font-semibold text-white">
                    {profile.fullName}
                  </h4>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Joined {formatDate(profile.createdAt)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeClass(profile.riskLevel)}`}
                >
                  {profile.riskLevel ?? "MEDIUM"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <p className="line-clamp-2 text-sm text-slate-300">
                  {profile.bio || "No bio set — add one in Profile Setup"}
                </p>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-slate-200">Platform:</span>{" "}
                  {profile.tradingPlatform || "Not set yet"}
                </p>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-slate-200">
                    Instruments:
                  </span>{" "}
                  {profile.instruments || "No instruments listed"}
                </p>
                {profile.strategyDescription && (
                  <p className="text-sm text-slate-400">
                    <span className="font-medium text-slate-200">
                      Strategy:
                    </span>{" "}
                    {profile.strategyDescription}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <MasterProfileSetup
          masterId={user.id}
          existingProfile={dashboardData.profile}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  );
}
