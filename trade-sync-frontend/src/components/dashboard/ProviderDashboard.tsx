"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Check,
  CircleDot,
  Copy,
  Download,
  Users,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import TraderCard, { TraderCardData } from "../marketplace/TraderCard";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Pill,
  SectionEyebrow,
  Skeleton,
  StatusPill,
} from "../ui";
import {
  MasterDashboardData,
  MasterProfile,
  TradeHistoryEntry,
  UpdateMasterProfileDto,
  profileService,
} from "../../services/api";
import { RootState } from "../../redux/slices/store";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatVolume,
} from "../../lib/format";

type ProviderTab = "overview" | "profile";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type HoldTime = "Seconds" | "Minutes" | "Hours" | "Days" | "Weeks";

type ProfileFormState = {
  bio: string;
  tradingPlatform: string;
  instruments: string;
  strategyDescription: string;
  riskLevel: RiskLevel;
  typicalHoldTime: HoldTime | "";
};

const HOLD_TIME_OPTIONS: HoldTime[] = [
  "Seconds",
  "Minutes",
  "Hours",
  "Days",
  "Weeks",
];

const PROFILE_KEYS = [
  "bio",
  "tradingPlatform",
  "instruments",
  "strategyDescription",
  "riskLevel",
  "typicalHoldTime",
] as const;

function profileToForm(profile: MasterProfile): ProfileFormState {
  const riskLevel =
    profile.riskLevel === "LOW" || profile.riskLevel === "HIGH"
      ? profile.riskLevel
      : "MEDIUM";
  const typicalHoldTime = HOLD_TIME_OPTIONS.includes(
    profile.typicalHoldTime as HoldTime,
  )
    ? (profile.typicalHoldTime as HoldTime)
    : "";

  return {
    bio: profile.bio ?? "",
    tradingPlatform: profile.tradingPlatform ?? "",
    instruments: profile.instruments ?? "",
    strategyDescription: profile.strategyDescription ?? "",
    riskLevel,
    typicalHoldTime,
  };
}

function changedProfileFields(
  baseline: ProfileFormState,
  current: ProfileFormState,
): UpdateMasterProfileDto {
  const dto: UpdateMasterProfileDto = {};

  PROFILE_KEYS.forEach((key) => {
    if (baseline[key] !== current[key]) {
      dto[key] = current[key];
    }
  });

  return dto;
}

function isToday(value: string) {
  const dt = new Date(value);
  const now = new Date();
  return (
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()
  );
}

function statusForDashboard(data: MasterDashboardData) {
  // TODO: replace this derived status when backend exposes real desktop socket presence.
  const hasTradeToday = data.recentTrades.some((trade) => isToday(trade.createdAt));
  return data.profile.subscriberCount > 0 || hasTradeToday ? "broadcasting" : "idle";
}

function isFirstTimeProvider(data: MasterDashboardData) {
  return (
    data.totalSignalsSent === 0 &&
    data.profile.bio === null &&
    data.profile.tradingPlatform === null
  );
}

function toTraderCardData(profile: MasterProfile): TraderCardData {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    instruments: profile.instruments,
    riskLevel:
      profile.riskLevel === "LOW" || profile.riskLevel === "HIGH"
        ? profile.riskLevel
        : "MEDIUM",
    // TODO: replace total P&L proxy once backend exposes a true 30-day ROI field.
    roi30d: profile.bio ? Number(profile.totalPnL.toFixed(1)) : undefined,
    winRate: profile.winRate,
    subscriberCount: profile.subscriberCount,
    isLive: profile.isLive,
    tradingPlatform: profile.tradingPlatform,
    typicalHoldTime: profile.typicalHoldTime,
    strategyDescription: profile.strategyDescription,
    bio: profile.bio,
  };
}

function PageHeader({ status }: { status: "broadcasting" | "idle" }) {
  return (
    <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <SectionEyebrow>PROVIDER CONSOLE</SectionEyebrow>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.025em]">
          Provider Performance Dashboard
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-2)]">
          Review your results, refine your identity, and publish a stronger
          public profile.
        </p>
      </div>
      <StatusPill
        status={status}
        label={status === "broadcasting" ? "STATUS: BROADCASTING" : "STATUS: IDLE"}
        mono
      />
    </div>
  );
}

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: ProviderTab;
  onChange: (tab: ProviderTab) => void;
}) {
  return (
    <div className="border-b border-[var(--color-line)]">
      <div className="flex gap-7">
        {[
          ["overview", "Overview"],
          ["profile", "Profile Setup"],
        ].map(([value, label]) => {
          const active = activeTab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value as ProviderTab)}
              className="py-3 text-sm font-medium"
              style={{
                color: active ? "var(--color-text)" : "var(--color-text-2)",
                borderBottom: active
                  ? "2px solid var(--color-mint)"
                  : "2px solid transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LicenseKeyBlock({ licenseKey }: { licenseKey?: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!licenseKey) return;

    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy license key", error);
      toast.error("Could not copy license key");
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
              YOUR LICENSE KEY
            </div>
            {licenseKey ? (
              <span className="font-mono-tnum inline-flex rounded-md border border-[var(--color-mint)] bg-[var(--color-mint-soft)] px-3 py-1.5 text-sm text-[var(--color-mint)]">
                {licenseKey}
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono-tnum text-[var(--color-text-3)]">--</span>
                <Pill variant="outline-warn">Awaiting admin issuance</Pill>
                <span className="text-xs text-[var(--color-text-3)]">
                  Admins issue provider license keys from the users panel.
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            disabled={!licenseKey}
            onClick={handleCopy}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function KpiIconSlot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white/[0.04] text-[var(--color-text-3)]">
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color = "var(--color-text)",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-3 text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
              {label}
            </div>
            <div
              className="font-mono-tnum text-4xl font-semibold leading-none tracking-[-0.02em]"
              style={{ color }}
            >
              {value}
            </div>
            {sub ? (
              <div className="mt-2 text-[11px] text-[var(--color-text-3)]">
                {sub}
              </div>
            ) : null}
          </div>
          <KpiIconSlot>{icon}</KpiIconSlot>
        </div>
      </CardBody>
    </Card>
  );
}

function ProviderKpiStrip({ data }: { data: MasterDashboardData }) {
  const winRate = data.profile.winRate;
  const winRateColor =
    winRate > 50
      ? "var(--color-mint)"
      : winRate < 40
        ? "var(--color-danger)"
        : "var(--color-text)";

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <KpiCard
        label="Total Signals Sent"
        value={data.totalSignalsSent.toLocaleString()}
        icon={<Activity size={16} strokeWidth={1.8} />}
      />
      <KpiCard
        label="Connected Copiers"
        value={data.subscriberCount.toLocaleString()}
        // TODO: replace placeholder with a live copier count endpoint when available.
        sub="Live sub-count pending backend endpoint"
        icon={<Users size={16} strokeWidth={1.8} />}
      />
      <KpiCard
        label="Open Trades"
        value={data.openTrades.toLocaleString()}
        icon={<CircleDot size={16} strokeWidth={1.8} />}
      />
      <KpiCard
        label="Win Rate"
        value={data.profile.closedTrades > 0 ? formatPercent(winRate) : "--"}
        color={data.profile.closedTrades > 0 ? winRateColor : "var(--color-text-3)"}
        icon={<BarChart3 size={16} strokeWidth={1.8} />}
      />
    </div>
  );
}

function MyPerformanceCard({ profile }: { profile: MasterProfile }) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-5 text-lg font-semibold">My Performance</h3>
        <div
          className="grid overflow-hidden rounded-xl border border-[var(--color-line)] md:grid-cols-3"
          style={{ background: "var(--color-line)" }}
        >
          <PerformanceMetric
            label="TOTAL P&L"
            value={formatCurrency(profile.totalPnL)}
            color={profile.totalPnL >= 0 ? "var(--color-mint)" : "var(--color-danger)"}
          />
          <PerformanceMetric label="AVG VOLUME" value={formatVolume(profile.avgVolume)} />
          <PerformanceMetric
            label="CLOSED TRADES"
            value={profile.closedTrades.toLocaleString()}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function PerformanceMetric({
  label,
  value,
  color = "var(--color-text)",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] p-5">
      <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
        {label}
      </div>
      <div
        className="font-mono-tnum mt-2 text-[22px] font-semibold tracking-[-0.015em]"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function RecentSignalHistory({ trades }: { trades: TradeHistoryEntry[] }) {
  const rows = trades.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="text-base font-semibold">Recent Signal History</div>
          <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
            LAST 10 TRADES
          </div>
        </div>
      </CardHeader>
      <div className="px-6 py-3">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-text-3)]">
            No signals have been broadcast yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_80px_80px_90px_90px_1.4fr] gap-4 border-b border-[var(--color-line)] py-3 text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
              <div>Symbol</div>
              <div>Action</div>
              <div className="text-right">Volume</div>
              <div className="text-right">P&L</div>
              <div>Status</div>
              <div>Date</div>
            </div>
            {rows.map((trade, index) => (
              <div
                key={trade.id}
                className="grid grid-cols-[1fr_80px_80px_90px_90px_1.4fr] items-center gap-4 py-3 text-sm"
                style={{
                  borderBottom:
                    index < rows.length - 1 ? "1px solid var(--color-line)" : "none",
                }}
              >
                <div className="font-medium">{trade.symbol}</div>
                <div>
                  <Pill variant={trade.action === "BUY" ? "mint" : "danger"}>
                    {trade.action}
                  </Pill>
                </div>
                <div className="font-mono-tnum text-right">
                  {formatVolume(Number(trade.volume))}
                </div>
                <div
                  className="font-mono-tnum text-right"
                  style={{
                    color:
                      trade.pnl == null
                        ? "var(--color-text-3)"
                        : trade.pnl >= 0
                          ? "var(--color-mint)"
                          : "var(--color-danger)",
                  }}
                >
                  {trade.pnl == null ? "--" : formatCurrency(trade.pnl, { sign: true })}
                </div>
                <div>
                  <Pill variant={trade.status === "OPEN" ? "mint" : "default"}>
                    {trade.status}
                  </Pill>
                </div>
                <div className="font-mono-tnum text-xs text-[var(--color-text-2)]">
                  {formatDateTime(trade.createdAt)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}

function PublicProfilePreview({
  profile,
  onEdit,
  incomplete = false,
}: {
  profile: MasterProfile;
  onEdit: () => void;
  incomplete?: boolean;
}) {
  const trader = toTraderCardData(profile);

  return (
    <Card>
      <CardBody>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Your Public Profile</h3>
            <p className="mt-1 text-sm text-[var(--color-text-2)]">
              Preview the profile card copiers will see in the marketplace.
            </p>
          </div>
          <Button variant="ghost-mint" size="sm" onClick={onEdit}>
            Edit Profile
          </Button>
        </div>
        <div className="max-w-md">
          <TraderCard
            trader={{
              ...trader,
              bio: incomplete ? null : trader.bio,
              tradingPlatform: incomplete ? null : trader.tradingPlatform,
              strategyDescription: incomplete ? null : trader.strategyDescription,
            }}
            mode="preview"
          />
        </div>
        {incomplete ? (
          <button
            type="button"
            onClick={onEdit}
            className="mt-4 text-sm text-[var(--color-mint)]"
          >
            Complete profile setup -&gt;
          </button>
        ) : null}
      </CardBody>
    </Card>
  );
}

function BroadcastTowerSvg() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      <path d="M36 50 Q60 26 84 50" stroke="var(--color-mint)" strokeWidth="1.5" opacity="0.3" />
      <path d="M28 52 Q60 16 92 52" stroke="var(--color-mint)" strokeWidth="1.5" opacity="0.5" />
      <path d="M20 54 Q60 6 100 54" stroke="var(--color-mint)" strokeWidth="1.5" opacity="0.7" />
      <line x1="60" y1="56" x2="42" y2="108" stroke="var(--color-mint)" strokeWidth="1.5" />
      <line x1="60" y1="56" x2="78" y2="108" stroke="var(--color-mint)" strokeWidth="1.5" />
      <line x1="48" y1="76" x2="72" y2="76" stroke="var(--color-mint)" strokeWidth="1.5" opacity="0.6" />
      <line x1="45" y1="92" x2="75" y2="92" stroke="var(--color-mint)" strokeWidth="1.5" opacity="0.6" />
      <circle cx="60" cy="54" r="4" fill="var(--color-mint)" />
    </svg>
  );
}

function FirstTimeProviderHero({ onSetup }: { onSetup: () => void }) {
  const router = useRouter();

  return (
    <Card>
      <EmptyState
        icon={<BroadcastTowerSvg />}
        iconFrame={false}
        title="Start broadcasting to attract copiers."
        description="Run the TradeSync desktop client, sign in with your license key, and click START BROADCASTING. Your first signal will appear here within seconds."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              leftIcon={<Download size={15} />}
              onClick={() => {
                // TODO: replace decorative downloads route when desktop packaging is ready.
                router.push("/downloads");
              }}
            >
              Download desktop client
            </Button>
            <Button variant="ghost" onClick={onSetup}>
              Set up your profile
            </Button>
          </div>
        }
      />
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-[var(--color-text)]">
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--color-line)",
  background: "var(--color-bg)",
  padding: "12px 14px",
  color: "var(--color-text)",
  fontSize: 14,
  outline: "none",
} as const;

function HoldTimeSelect({
  value,
  onChange,
}: {
  value: HoldTime | "";
  onChange: (value: HoldTime) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          ...inputStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{value || "Select duration"}</span>
        <span style={{ color: "var(--color-text-3)" }}>
          {open ? "Up" : "Down"}
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface-2)] shadow-[0_16px_36px_rgba(0,0,0,0.4)]">
          {HOLD_TIME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="block w-full px-4 py-3 text-left text-sm"
              style={{
                color:
                  option === value ? "var(--color-mint)" : "var(--color-text)",
                background:
                  option === value ? "var(--color-mint-soft)" : "transparent",
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProviderProfileForm({
  profile,
  onSaved,
}: {
  profile: MasterProfile;
  onSaved: () => Promise<void>;
}) {
  const [baseline, setBaseline] = useState<ProfileFormState>(() =>
    profileToForm(profile),
  );
  const [form, setForm] = useState<ProfileFormState>(() => profileToForm(profile));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = profileToForm(profile);
    setBaseline(next);
    setForm(next);
  }, [profile]);

  const charCount = form.bio.length;
  const charDanger = charCount > 270;

  const updateForm = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dto = changedProfileFields(baseline, form);

    if (Object.keys(dto).length === 0) {
      toast.success("No profile changes to save");
      return;
    }

    setSaving(true);
    try {
      await profileService.updateMasterProfile(profile.id, dto);
      toast.success("Profile saved");
      await onSaved();
    } catch (error) {
      console.error("Failed to save provider profile", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardBody>
          <SectionEyebrow color="mint">PROVIDER IDENTITY</SectionEyebrow>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
            Profile Setup
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-2)]">
            Tell copiers who you are, how you trade, and what they can expect.
          </p>

          <div className="mt-7 space-y-6">
            <div className="space-y-2">
              <FieldLabel>About Your Trading</FieldLabel>
              <div className="relative">
                <textarea
                  value={form.bio}
                  onChange={(event) => updateForm("bio", event.target.value)}
                  rows={4}
                  maxLength={300}
                  placeholder="Describe your edge in two sentences. What do you trade and why?"
                  style={{ ...inputStyle, minHeight: 112, paddingBottom: 30, resize: "vertical" }}
                />
                <div
                  className="font-mono-tnum absolute bottom-2 right-3 text-[11px]"
                  style={{
                    color: charDanger ? "var(--color-danger)" : "var(--color-text-3)",
                  }}
                >
                  {charCount} / 300
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Broker / Platform</FieldLabel>
                <input
                  value={form.tradingPlatform}
                  onChange={(event) =>
                    updateForm("tradingPlatform", event.target.value)
                  }
                  placeholder="Exness"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Typical Trade Duration</FieldLabel>
                <HoldTimeSelect
                  value={form.typicalHoldTime}
                  onChange={(value) => updateForm("typicalHoldTime", value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>Instruments You Trade</FieldLabel>
              <input
                value={form.instruments}
                onChange={(event) => updateForm("instruments", event.target.value)}
                placeholder="XAUUSD, EURUSD, BTCUSD"
                style={inputStyle}
              />
              <p className="text-xs text-[var(--color-text-3)]">
                Comma-separated. This helps copiers set up their symbol mapping.
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel>Trading Strategy</FieldLabel>
              <input
                value={form.strategyDescription}
                onChange={(event) =>
                  updateForm("strategyDescription", event.target.value)
                }
                placeholder="Scalping"
                style={inputStyle}
              />
              <p className="text-xs text-[var(--color-text-3)]">
                Examples: Scalping, Swing, Macro, News, Breakout.
              </p>
            </div>

            <div className="space-y-3">
              <FieldLabel>Risk Level</FieldLabel>
              <div className="flex flex-wrap gap-3">
                {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((level) => {
                  const active = form.riskLevel === level;
                  const color =
                    level === "LOW"
                      ? "var(--color-mint)"
                      : level === "HIGH"
                        ? "var(--color-danger)"
                        : "var(--color-warn)";
                  const soft =
                    level === "LOW"
                      ? "var(--color-mint-soft)"
                      : level === "HIGH"
                        ? "var(--color-danger-soft)"
                        : "var(--color-warn-soft)";

                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateForm("riskLevel", level)}
                      className="rounded-full px-5 py-2 text-xs font-semibold tracking-[0.03em]"
                      style={{
                        background: active ? soft : "transparent",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: color,
                        color,
                      }}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardBody>
        <div className="sticky bottom-0 flex flex-col gap-4 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-[var(--color-text-3)]">
            Saved profile updates will appear on the dashboard and in the public
            marketplace.
          </div>
          <Button type="submit" loading={saving}>
            Save Profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6 px-8 pb-20">
      <div className="flex justify-between gap-6">
        <div className="space-y-3">
          <Skeleton width={140} />
          <Skeleton width={420} height={34} />
          <Skeleton width={520} />
        </div>
        <Skeleton width={140} height={30} />
      </div>
      <Skeleton variant="rect" height={84} />
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rect" height={128} />
        ))}
      </div>
      <Skeleton variant="rect" height={220} />
      <Skeleton variant="rect" height={320} />
    </div>
  );
}

export default function ProviderDashboard() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [dashboardData, setDashboardData] = useState<MasterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProviderTab>("overview");

  const loadDashboard = useCallback(async () => {
    if (!user?.id || user.role !== "MASTER") return;

    try {
      const data = await profileService.getMasterDashboard(user.id);
      setDashboardData(data);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load provider dashboard", loadError);
      setError("Failed to load your provider dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id || user.role !== "MASTER") {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [loadDashboard, user?.id, user?.role]);

  const status = useMemo(
    () => (dashboardData ? statusForDashboard(dashboardData) : "idle"),
    [dashboardData],
  );

  if (!user || user.role !== "MASTER") return null;
  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="mx-auto max-w-[1240px] px-8">
        <Card variant="role-danger">
          <CardBody>
            <div className="text-sm text-[var(--color-danger)]">{error}</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!dashboardData) return null;

  const firstTime = isFirstTimeProvider(dashboardData);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 px-8 pb-20">
      <PageHeader status={status} />
      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <LicenseKeyBlock licenseKey={user.licenseKey} />
          <ProviderKpiStrip data={dashboardData} />

          {firstTime ? (
            <FirstTimeProviderHero onSetup={() => setActiveTab("profile")} />
          ) : (
            <>
              <MyPerformanceCard profile={dashboardData.profile} />
              <RecentSignalHistory trades={dashboardData.recentTrades} />
            </>
          )}

          <PublicProfilePreview
            profile={dashboardData.profile}
            incomplete={firstTime}
            onEdit={() => setActiveTab("profile")}
          />
        </div>
      ) : (
        <ProviderProfileForm
          profile={dashboardData.profile}
          onSaved={async () => {
            await loadDashboard();
            setActiveTab("overview");
          }}
        />
      )}
    </div>
  );
}
