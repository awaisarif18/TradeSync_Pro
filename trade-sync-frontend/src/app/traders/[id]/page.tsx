"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import PnLChart from "../../../components/dashboard/PnLChart";
import TradeHistoryModal from "../../../components/master/TradeHistoryModal";
import InstrumentsCard from "../../../components/marketplace/InstrumentsCard";
import PerformanceBigCard from "../../../components/marketplace/PerformanceBigCard";
import ProviderHeroBand from "../../../components/marketplace/ProviderHeroBand";
import RiskProfileCard from "../../../components/marketplace/RiskProfileCard";
import TradingHoursCard from "../../../components/marketplace/TradingHoursCard";
import { Button, Card, CardBody, EmptyState, Pill, SectionEyebrow } from "../../../components/ui";
import { loginSuccess } from "../../../redux/slices/authSlice";
import type { RootState } from "../../../redux/slices/store";
import {
  marketplaceService,
  type MasterProfile,
  type TradeHistoryEntry,
} from "../../../services/api";

type DetailTab = "overview" | "history" | "stats" | "reviews";

function normalizeRisk(riskLevel: string | null): {
  label: string;
  variant: "outline-mint" | "outline-warn" | "outline-danger";
} {
  if (riskLevel === "LOW") return { label: "Low risk", variant: "outline-mint" };
  if (riskLevel === "HIGH") return { label: "High risk", variant: "outline-danger" };
  return { label: "Med risk", variant: "outline-warn" };
}

function handleFor(profile: MasterProfile): string {
  return profile.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function primaryAsset(profile: MasterProfile): string {
  if (!profile.instruments) return "Multi-asset";
  return profile.instruments.split(",")[0]?.trim() || "Multi-asset";
}

function formatPnl(value: number | null): string {
  if (value === null) return "-";
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function tradeTime(entry: TradeHistoryEntry): string {
  return new Date(entry.createdAt).toLocaleTimeString("en-GB", { hour12: false });
}

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const masterId = params.id;
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [history, setHistory] = useState<TradeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        const [profileRow, historyRows] = await Promise.all([
          marketplaceService.getMasterProfile(masterId),
          marketplaceService.getMasterHistory(masterId),
        ]);

        setProfile(profileRow);
        setHistory(historyRows);
      } catch (error) {
        console.error("Failed to load provider detail", error);
        setProfile(null);
        setHistory([]);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [masterId]);

  const risk = useMemo(() => (profile ? normalizeRisk(profile.riskLevel) : null), [profile]);
  const recentTrades = history.slice(0, 10);
  const isSubscribed = user?.subscribedToId === masterId;
  const isAdmin = user?.role === "ADMIN";
  const isMaster = user?.role === "MASTER";

  const copyLabel = isSubscribed
    ? "Already subscribed"
    : isMaster
      ? "Providers can't subscribe"
      : "Copy this provider";
  const copyDisabled = isSubscribed;

  const handleCopyProvider = async () => {
    if (!profile) return;

    if (!user) {
      router.push(`/login?next=/traders/${masterId}`);
      return;
    }

    if (user.role === "MASTER") {
      toast.error("Providers can't subscribe to other providers");
      return;
    }

    if (user.role !== "SLAVE") return;

    try {
      const response = await marketplaceService.updateSubscription(user.id, masterId);
      dispatch(
        loginSuccess({
          user: {
            ...user,
            subscribedToId: response.subscribedToId ?? masterId,
          },
        }),
      );
      toast.success(`Subscribed to ${profile.fullName}`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to subscribe to provider", error);
      toast.error("Failed to update subscription");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "48px 32px" }}>
        <EmptyState title="Loading provider" description="Fetching profile and trade history..." />
      </div>
    );
  }

  if (notFound || !profile || !risk) {
    return (
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "48px 32px" }}>
        <EmptyState
          title="Provider not found"
          description="This provider may be inactive, disabled, or unavailable."
          action={
            <Link href="/traders" style={{ textDecoration: "none" }}>
              <Button variant="ghost-mint">Back to marketplace</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 32px 0" }}>
        <Link
          href="/traders"
          style={{
            color: "var(--color-text-2)",
            fontSize: 14,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          &larr; Back to marketplace
        </Link>
      </div>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "32px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(700px 400px at 90% -20%, rgba(0,195,137,0.10), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <ProviderHeroBand
          profile={profile}
          handle={handleFor(profile)}
          primaryAsset={primaryAsset(profile)}
          riskLabel={risk.label}
          riskVariant={risk.variant}
        />
        <PerformanceBigCard
          profile={profile}
          copyLabel={copyLabel}
          copyDisabled={copyDisabled}
          copyHidden={isAdmin}
          onCopy={handleCopyProvider}
        />
      </div>

      <div style={{ borderBottom: "1px solid var(--color-line)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px", display: "flex", gap: 28 }}>
          {[
            ["overview", "Overview"],
            ["history", "Trade history"],
            ["stats", "Stats"],
            ["reviews", "Reviews"],
          ].map(([value, label]) => {
            const active =
              value === "history"
                ? activeTab === "history" || isHistoryModalOpen
                : activeTab === value;
            return (
              <span
                key={value}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (value === "history") {
                    setActiveTab("history");
                    setIsHistoryModalOpen(true);
                    return;
                  }

                  setActiveTab(value as DetailTab);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    if (value === "history") {
                      setActiveTab("history");
                      setIsHistoryModalOpen(true);
                    } else {
                      setActiveTab(value as DetailTab);
                    }
                  }
                }}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "14px 0",
                  color: active ? "var(--color-text)" : "var(--color-text-2)",
                  borderBottom: active ? "2px solid var(--color-mint)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" || activeTab === "history" ? (
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: 32,
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Card>
              <CardBody>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
                  <div>
                    <SectionEyebrow color="mint">Recent signals</SectionEyebrow>
                    <h3 style={{ fontSize: 20, fontWeight: 600, margin: "6px 0 0" }}>Last 10 trades</h3>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsHistoryModalOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setIsHistoryModalOpen(true);
                    }}
                    style={{ color: "var(--color-mint)", fontSize: 13, cursor: "pointer" }}
                  >
                    View full history &rarr;
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 70px 70px 90px 90px",
                    gap: 12,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    color: "var(--color-text-3)",
                    padding: "0 0 8px",
                    borderBottom: "1px solid var(--color-line)",
                  }}
                >
                  <div>Time</div>
                  <div>Symbol</div>
                  <div>Action</div>
                  <div style={{ textAlign: "right" }}>Volume</div>
                  <div style={{ textAlign: "right" }}>P&L</div>
                  <div style={{ textAlign: "right" }}>Status</div>
                </div>
                {recentTrades.length === 0 ? (
                  <EmptyState title="No recent signals" description="This provider has no public trade history yet." />
                ) : (
                  recentTrades.map((entry, index) => (
                    <div
                      key={entry.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 70px 70px 90px 90px",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom: index < recentTrades.length - 1 ? "1px solid var(--color-line)" : "none",
                        fontSize: 13,
                      }}
                    >
                      <div className="font-mono-tnum" style={{ color: "var(--color-text-3)" }}>
                        {tradeTime(entry)}
                      </div>
                      <div style={{ fontWeight: 500 }}>{entry.symbol}</div>
                      <div>
                        <Pill variant={entry.action === "BUY" ? "mint" : "danger"}>{entry.action}</Pill>
                      </div>
                      <div className="font-mono-tnum" style={{ textAlign: "right" }}>
                        {entry.volume.toFixed(2)}
                      </div>
                      <div
                        className="font-mono-tnum"
                        style={{
                          textAlign: "right",
                          color: (entry.pnl ?? 0) >= 0 ? "var(--color-mint)" : "var(--color-danger)",
                        }}
                      >
                        {formatPnl(entry.pnl)}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Pill variant={entry.status === "OPEN" ? "mint" : "default"}>{entry.status}</Pill>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Cumulative P&L (90 days)</h3>
                  <Pill variant={profile.totalPnL >= 0 ? "outline-mint" : "outline-danger"}>
                    <span className="font-mono-tnum">{formatPnl(profile.totalPnL)}</span>
                  </Pill>
                </div>
                <PnLChart history={history} />
              </CardBody>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <RiskProfileCard />
            <InstrumentsCard instruments={profile.instruments} />
            <TradingHoursCard />
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: 32 }}>
          {/* TODO: Stats and Reviews are placeholders until backend exposes those aggregates. */}
          <EmptyState title="Coming soon" description={`${activeTab === "stats" ? "Stats" : "Reviews"} will be added in a later phase.`} />
        </div>
      )}

      <TradeHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
        }}
        history={history}
        loading={false}
        masterName={profile.fullName}
      />
    </div>
  );
}
