"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Radio,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import TraderCard, {
  TraderCardData,
} from "../marketplace/TraderCard";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  EmptyState,
  Pill,
  SectionEyebrow,
  StatusPill,
} from "../ui";
import {
  MasterProfile,
  TradeHistoryEntry,
  marketplaceService,
  profileService,
} from "../../services/api";
import { RootState } from "../../redux/slices/store";
import { loginSuccess } from "../../redux/slices/authSlice";
import { useIncomingSignals, IncomingTrade } from "../../hooks/useIncomingSignals";
import { formatCurrency, formatVolume } from "../../lib/format";

interface MasterUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

type DashboardStatus = "listening" | "idle" | "not-subscribed" | "disconnected";

function normalizeRisk(riskLevel: string | null): TraderCardData["riskLevel"] {
  if (riskLevel === "LOW" || riskLevel === "HIGH") return riskLevel;
  return "MEDIUM";
}

function riskPillVariant(
  riskLevel: TraderCardData["riskLevel"],
): "outline-mint" | "outline-warn" | "outline-danger" {
  if (riskLevel === "LOW") return "outline-mint";
  if (riskLevel === "HIGH") return "outline-danger";
  return "outline-warn";
}

function displayHandle(profile: MasterProfile | null, master?: MasterUser) {
  const email = profile?.email ?? master?.email;
  if (email) return email.split("@")[0];

  return (profile?.fullName ?? master?.fullName ?? "provider")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function displayAsset(profile: MasterProfile | null) {
  if (!profile?.instruments?.trim()) return "Multi-asset";
  return profile.instruments.split(",")[0]?.trim() || "Multi-asset";
}

function toTraderCardData(
  master: MasterUser,
  profile: MasterProfile | undefined,
): TraderCardData {
  return {
    id: master.id,
    fullName: profile?.fullName ?? master.fullName,
    email: profile?.email ?? master.email,
    instruments: profile?.instruments ?? null,
    riskLevel: normalizeRisk(profile?.riskLevel ?? null),
    // TODO: replace total P&L proxy once backend exposes a 30-day ROI field.
    roi30d: profile ? Number(profile.totalPnL.toFixed(1)) : undefined,
    winRate: profile?.winRate ?? 0,
    subscriberCount: profile?.subscriberCount ?? 0,
    isLive: profile?.isLive ?? false,
    tradingPlatform: profile?.tradingPlatform ?? null,
    typicalHoldTime: profile?.typicalHoldTime ?? null,
    strategyDescription: profile?.strategyDescription ?? null,
    bio: profile?.bio ?? null,
  };
}

function KpiIconSlot({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-line)",
        color: "var(--color-text-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function PageHeader({ status }: { status: DashboardStatus }) {
  const labels: Record<DashboardStatus, string> = {
    listening: "STATUS: LISTENING",
    idle: "CONNECTING...",
    "not-subscribed": "STATUS: NOT SUBSCRIBED",
    disconnected: "STATUS: DISCONNECTED",
  };

  return (
    <div className="flex items-start justify-between gap-6 px-0 pb-6 pt-0">
      <div>
        <SectionEyebrow>COPIER CONSOLE</SectionEyebrow>
        <h1
          className="mt-2"
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.025em",
          }}
        >
          Copier Terminal
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-2)" }}>
          Browse providers, inspect their identity, and subscribe with confidence.
        </p>
      </div>
      <StatusPill status={status} label={labels[status]} mono />
    </div>
  );
}

function CopierKpiStrip({
  activeProfile,
  activeMaster,
  isSubscribed,
  onBrowse,
}: {
  activeProfile: MasterProfile | null;
  activeMaster?: MasterUser;
  isSubscribed: boolean;
  onBrowse: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
                Active Provider
              </div>
              {isSubscribed ? (
                <div className="mt-3 flex min-w-0 items-center gap-3">
                  <Avatar
                    name={activeProfile?.fullName ?? activeMaster?.fullName ?? "Provider"}
                    size={24}
                  />
                  <div className="truncate text-[22px] font-semibold tracking-[-0.015em]">
                    {activeProfile?.fullName ?? activeMaster?.fullName ?? "Loading provider"}
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="mb-3 text-base italic text-[var(--color-text-2)]">
                    None selected
                  </div>
                  <Button variant="ghost" size="sm" onClick={onBrowse}>
                    Browse marketplace -&gt;
                  </Button>
                </div>
              )}
            </div>
            <KpiIconSlot>
              <Radio size={16} strokeWidth={1.8} />
            </KpiIconSlot>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
                Latency
              </div>
              <div
                className="font-mono-tnum mt-2 text-[22px] font-semibold tracking-[-0.015em]"
                style={{ color: isSubscribed ? "var(--color-mint)" : "var(--color-text-3)" }}
              >
                {isSubscribed ? "< 20 ms" : "--"}
              </div>
              <div className="mt-1 text-[11px] text-[var(--color-text-3)]">
                {isSubscribed ? "synthetic estimate" : "no provider selected"}
              </div>
            </div>
            <KpiIconSlot>
              <Zap size={16} strokeWidth={1.8} />
            </KpiIconSlot>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
                Risk Multiplier
              </div>
              <div className="mt-3 text-base italic text-[var(--color-text-2)]">
                Managed by app
              </div>
              <div className="mt-1 text-[11px] text-[var(--color-text-3)]">
                Configure in desktop client
              </div>
            </div>
            <KpiIconSlot>
              <ShieldAlert size={16} strokeWidth={1.8} />
            </KpiIconSlot>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function ActiveSubscriptionCard({
  profile,
  master,
  todayCount,
  sessionPnl,
  mirroredTrades,
  onViewProfile,
  onUnsubscribe,
}: {
  profile: MasterProfile | null;
  master?: MasterUser;
  todayCount: number;
  sessionPnl: number;
  mirroredTrades: number;
  onViewProfile: () => void;
  onUnsubscribe: () => void;
}) {
  const name = profile?.fullName ?? master?.fullName ?? "Loading provider";
  const riskLevel = normalizeRisk(profile?.riskLevel ?? null);
  const pnlColor = sessionPnl >= 0 ? "var(--color-mint)" : "var(--color-danger)";
  const totalPnlColor =
    profile && profile.totalPnL < 0 ? "var(--color-danger)" : "var(--color-mint)";

  return (
    <Card variant="role-violet">
      <CardBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <Avatar name={name} size={36} />
              <div className="text-lg font-semibold">{name}</div>
              <BadgeCheck size={15} strokeWidth={2.6} style={{ color: "var(--color-mint)" }} />
              <span className="text-sm text-[var(--color-text-3)]">
                @{displayHandle(profile, master)} - {displayAsset(profile)}
              </span>
              <Pill variant={riskPillVariant(riskLevel)}>
                {riskLevel[0] + riskLevel.slice(1).toLowerCase()} risk
              </Pill>
              <span className="ml-auto text-xs text-[var(--color-text-3)]">
                Subscribed
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <SubscriptionStat
                label="Provider's 30d ROI"
                value={profile ? formatCurrency(profile.totalPnL, { sign: true }) : "--"}
                color={profile ? totalPnlColor : "var(--color-text-3)"}
              />
              <SubscriptionStat label="Today's signals" value={todayCount.toString()} />
              <SubscriptionStat
                label="Your session P&L"
                value={formatCurrency(sessionPnl, { sign: true })}
                color={pnlColor}
              />
              <SubscriptionStat label="Mirrored trades" value={mirroredTrades.toString()} />
            </div>
          </div>

          <div className="flex min-w-[200px] flex-col gap-3">
            <Button variant="ghost" size="sm" onClick={onViewProfile}>
              View provider profile
            </Button>
            <Button variant="ghost-danger" size="sm" onClick={onUnsubscribe}>
              Unsubscribe
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SubscriptionStat({
  label,
  value,
  color = "var(--color-text)",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
        {label}
      </div>
      <div
        className="font-mono-tnum mt-1 text-[22px] font-semibold tracking-[-0.015em]"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function IncomingSignalsTable({
  trades,
  todayCount,
}: {
  trades: IncomingTrade[];
  todayCount: number;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <SectionEyebrow color="mint">INCOMING SIGNALS</SectionEyebrow>
            <h3 className="mt-1 text-lg font-semibold">Live feed from your provider</h3>
          </div>
          <Pill variant="outline-mint">
            <span className="font-mono-tnum">{todayCount} today</span>
          </Pill>
        </div>

        <div className="grid grid-cols-[90px_110px_1fr_80px_1fr] gap-4 border-b border-[var(--color-line)] pb-3 text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
          <div>Time</div>
          <div>Order</div>
          <div>Symbol</div>
          <div className="text-right">Volume</div>
          <div>Status</div>
        </div>

        {trades.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-3)]">
            <Clock3 className="mx-auto mb-3 opacity-50" size={32} />
            Waiting for live market signals...
          </div>
        ) : (
          trades.map((trade, index) => (
            <SignalRow
              key={`${trade.master_ticket}-${trade.event}-${trade.time}-${index}`}
              trade={trade}
              isLast={index === trades.length - 1}
            />
          ))
        )}
      </CardBody>
    </Card>
  );
}

function SignalRow({
  trade,
  isLast,
}: {
  trade: IncomingTrade;
  isLast: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[90px_110px_1fr_80px_1fr] items-center gap-4 py-3 text-sm"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--color-line)" }}
    >
      <div className="font-mono-tnum text-[var(--color-text-3)]">{trade.time}</div>
      <div className="font-mono-tnum text-[var(--color-text-2)]">
        #{trade.master_ticket}
      </div>
      <div className="font-medium">{trade.symbol}</div>
      <div className="font-mono-tnum text-right">{formatVolume(Number(trade.volume))}</div>
      <TradeStatus trade={trade} />
    </div>
  );
}

function TradeStatus({ trade }: { trade: IncomingTrade }) {
  if (trade.event === "CLOSE" && trade.pnl != null) {
    const pnl = Number(trade.pnl);

    return (
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-[var(--color-text-3)]" />
        <span className="rounded bg-white/5 px-2 py-1 text-[11px] font-semibold text-[var(--color-text-3)]">
          CLOSED
        </span>
        <span
          className="font-mono-tnum text-sm font-semibold"
          style={{ color: pnl >= 0 ? "var(--color-mint)" : "var(--color-danger)" }}
        >
          {formatCurrency(pnl, { sign: true })}
        </span>
      </div>
    );
  }

  if (trade.event === "OPEN") {
    return (
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-[var(--color-mint)] shadow-[0_0_0_3px_var(--color-mint-soft)] animate-pulse" />
        <span className="rounded bg-[var(--color-mint-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-mint)]">
          OPEN
        </span>
      </div>
    );
  }

  // TODO: render IGNORED and FAILED rows once backend/client emit those states.
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 rounded-full bg-[var(--color-text-3)]" />
      <span className="rounded bg-white/5 px-2 py-1 text-[11px] font-semibold text-[var(--color-text-3)]">
        {trade.event}
      </span>
    </div>
  );
}

function BridgeIllustration() {
  return (
    <svg
      width="240"
      height="120"
      viewBox="0 0 240 120"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      <rect x="14" y="32" width="78" height="56" rx="8" stroke="var(--color-mint)" strokeWidth="1.5" />
      <rect x="22" y="40" width="38" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.6" />
      <rect x="22" y="48" width="58" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.4" />
      <rect x="22" y="56" width="46" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.4" />
      <rect x="22" y="74" width="20" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.6" />
      <rect x="148" y="32" width="78" height="56" rx="8" stroke="var(--color-mint)" strokeWidth="1.5" />
      <rect x="156" y="40" width="38" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.6" />
      <rect x="156" y="48" width="58" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.4" />
      <rect x="156" y="56" width="46" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.4" />
      <rect x="156" y="74" width="20" height="3" rx="1.5" fill="var(--color-mint)" opacity="0.6" />
      <line x1="92" y1="60" x2="148" y2="60" stroke="var(--color-mint)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.7" />
      <circle cx="92" cy="60" r="3.5" fill="var(--color-bg)" stroke="var(--color-mint)" strokeWidth="1.5" />
      <circle cx="148" cy="60" r="3.5" fill="var(--color-mint)" />
      <text x="53" y="104" fill="var(--color-text-3)" fontSize="10" textAnchor="middle">
        Provider
      </text>
      <text x="187" y="104" fill="var(--color-text-3)" fontSize="10" textAnchor="middle">
        You
      </text>
    </svg>
  );
}

export default function CopierDashboard() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { trades, connectionState, todayCount, sessionPnl, mirroredTrades } =
    useIncomingSignals();

  const [masters, setMasters] = useState<MasterUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profilesByMaster, setProfilesByMaster] = useState<
    Record<string, MasterProfile>
  >({});
  const [, setHistoryByMaster] = useState<Record<string, TradeHistoryEntry[]>>({});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(
    user?.subscribedToId ?? null,
  );

  useEffect(() => {
    setCurrentSubscription(user?.subscribedToId ?? null);
  }, [user?.subscribedToId]);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const data = await marketplaceService.getActiveMasters();
        setMasters(data);

        const profileEntries = await Promise.all(
          data.map(async (master: MasterUser) => {
            const profile = await profileService.getMasterProfile(master.id);
            return [master.id, profile] as const;
          }),
        );

        const historyEntries = await Promise.all(
          data.map(async (master: MasterUser) => {
            const history = await profileService.getMasterHistory(master.id);
            return [master.id, history] as const;
          }),
        );

        setProfilesByMaster(Object.fromEntries(profileEntries));
        setHistoryByMaster(Object.fromEntries(historyEntries));
      } catch (error) {
        console.error("Failed to fetch masters", error);
        setProfileError("Failed to load marketplace insights.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasters();
  }, []);

  const handleSubscribe = async (masterId: string | null) => {
    if (!user) return;

    try {
      const response = await marketplaceService.updateSubscription(
        user.id,
        masterId,
      );

      setCurrentSubscription(response.subscribedToId);
      dispatch(
        loginSuccess({
          ...user,
          subscribedToId: response.subscribedToId,
        }),
      );

      toast.success(masterId ? "Subscription updated" : "Unsubscribed");
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err.response?.data?.message || "Failed to update subscription";
      toast.error(message);
      console.error("Failed to update subscription", error);
    }
  };

  const activeMaster = masters.find((master) => master.id === currentSubscription);
  const activeProfile = currentSubscription
    ? profilesByMaster[currentSubscription] ?? null
    : null;
  const isSubscribed = currentSubscription !== null;

  const dashboardStatus: DashboardStatus = !isSubscribed
    ? "not-subscribed"
    : connectionState === "connected"
      ? "listening"
      : connectionState === "connecting"
        ? "idle"
        : "disconnected";

  const traderCards = useMemo(
    () =>
      masters.map((master) => ({
        master,
        trader: toTraderCardData(master, profilesByMaster[master.id]),
      })),
    [masters, profilesByMaster],
  );
  const trendingCards = traderCards.slice(0, 3);

  const marketplace = (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <SectionEyebrow color="mint">
            {isSubscribed ? "BROWSE OTHER PROVIDERS" : "TOP PROVIDERS THIS MONTH"}
          </SectionEyebrow>
          <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.025em]">
            {isSubscribed ? "Provider Marketplace" : "Trending now"}
          </h2>
        </div>
        {isSubscribed ? (
          <button
            type="button"
            className="text-sm text-[var(--color-mint)]"
            onClick={() => router.push("/traders")}
          >
            See all {masters.length} -&gt;
          </button>
        ) : null}
      </div>

      {profileError ? (
        <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {profileError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-[var(--color-text-3)]">
          Loading available providers...
        </div>
      ) : masters.length === 0 ? (
        <div className="text-sm text-[var(--color-text-3)]">
          No active providers available.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {(isSubscribed ? traderCards : trendingCards).map(({ master, trader }) => {
            const subscribed = currentSubscription === master.id;

            return (
              <TraderCard
                key={master.id}
                trader={trader}
                mode={subscribed ? "subscribed" : "marketplace"}
                actionLabel={subscribed ? "View profile" : "Subscribe"}
                actionVariant={subscribed ? "ghost" : "primary"}
                onAction={() => {
                  if (subscribed) {
                    router.push(`/traders/${master.id}`);
                    return;
                  }

                  handleSubscribe(master.id);
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 px-8 pb-20">
      <PageHeader status={dashboardStatus} />

      <CopierKpiStrip
        activeProfile={activeProfile}
        activeMaster={activeMaster}
        isSubscribed={isSubscribed}
        onBrowse={() => router.push("/traders")}
      />

      {isSubscribed ? (
        <>
          <ActiveSubscriptionCard
            profile={activeProfile}
            master={activeMaster}
            todayCount={todayCount}
            sessionPnl={sessionPnl}
            mirroredTrades={mirroredTrades}
            onViewProfile={() => router.push(`/traders/${currentSubscription}`)}
            onUnsubscribe={() => handleSubscribe(null)}
          />

          {marketplace}

          <IncomingSignalsTable trades={trades} todayCount={todayCount} />
        </>
      ) : (
        <>
          <Card>
            <EmptyState
              icon={<BridgeIllustration />}
              iconFrame={false}
              title="Pick a provider to start mirroring."
              description="You're connected to TradeSync. Browse verified providers, subscribe to one, and your desktop client will start mirroring within seconds."
              action={
                <Button
                  rightIcon={<ArrowRight size={15} />}
                  onClick={() => router.push("/traders")}
                >
                  Browse providers
                </Button>
              }
            />
          </Card>

          <div className="flex flex-wrap justify-center gap-7 text-sm text-[var(--color-text-2)]">
            {[
              "KYC verified providers",
              "Audited 90-day history",
              "Sub-second mirror lag",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check size={14} strokeWidth={2.4} style={{ color: "var(--color-mint)" }} />
                {item}
              </div>
            ))}
          </div>

          {marketplace}
        </>
      )}
    </div>
  );
}
