import type { TraderCardData } from "../components/marketplace/TraderCard";
import type { MasterProfile, TopMaster } from "../services/api";

type MasterListRow = { id: string; fullName?: string; email?: string };

function normalizeRisk(riskLevel: string | null | undefined): TraderCardData["riskLevel"] {
  if (riskLevel === "LOW" || riskLevel === "MEDIUM" || riskLevel === "HIGH") return riskLevel;
  return "MEDIUM";
}

/** Rough % for card chrome when no true 30d ROI exists; scales total PnL into a bounded range. */
export function proxyRoi30dFromTotals(totalPnL: number, closedTrades: number): number | undefined {
  if (closedTrades < 1) return undefined;
  const raw = totalPnL / 75;
  return Number(Math.min(99.9, Math.max(-99.9, raw)).toFixed(1));
}

export function mapMasterProfileToTraderCardData(
  master: MasterListRow,
  profile: MasterProfile | TopMaster | null,
  liveIds: string[],
): TraderCardData {
  return {
    id: master.id,
    fullName: profile?.fullName ?? master.fullName ?? "Provider",
    email: profile?.email ?? master.email,
    instruments: profile?.instruments ?? null,
    riskLevel: normalizeRisk(profile?.riskLevel),
    winRate: profile?.winRate ?? 0,
    subscriberCount: profile?.subscriberCount ?? 0,
    isLive: liveIds.includes(master.id) || profile?.isLive === true,
    tradingPlatform: profile?.tradingPlatform ?? null,
    typicalHoldTime: profile?.typicalHoldTime ?? null,
    strategyDescription: profile?.strategyDescription ?? null,
    bio: profile?.bio ?? null,
    roi30d:
      profile != null
        ? proxyRoi30dFromTotals(profile.totalPnL, profile.closedTrades)
        : undefined,
    equitySparkline:
      profile?.equitySparkline && profile.equitySparkline.length > 0
        ? profile.equitySparkline
        : undefined,
  };
}
