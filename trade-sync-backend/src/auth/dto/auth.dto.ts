// Response shape for verify-node
export interface VerifyNodeResponse {
  message: string;
  role: string;
  fullName: string;
  id: string;
  trace_id?: string;
}

/** Optional; derived from last N closed TradeLogs (see MASTER_ANALYTICS_CLOSED_CAP). */
export interface MasterRiskMetricsDto {
  maxDrawdownPercent: number;
  avgTradesPerDay: number;
  longestLosingStreakTrades: number;
  bestDayPnl: number;
}

// Response shape for master profile
export interface MasterProfileResponse {
  id: string;
  fullName: string;
  createdAt: Date;
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  totalPnL: number;
  avgVolume: number;
  bio: string | null;
  tradingPlatform: string | null;
  instruments: string | null;
  strategyDescription: string | null;
  riskLevel: string | null;
  typicalHoldTime: string | null;
  subscriberCount: number;
  isLive: boolean;
  /** Present when capped closed-trade sample is non-empty. */
  riskMetrics?: MasterRiskMetricsDto;
  /** Cumulative PnL curve (downsampled) for sparkline UI. */
  equitySparkline?: number[];
  /** UTC activity window from recent closed trades; null if not enough data. */
  activeHoursSummary?: string | null;
}

// Response shape for subscriber list item
export interface SubscriberSummary {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  totalCopied: number;
  totalPnL: number;
}

// DTO for updating master profile
export class UpdateMasterProfileDto {
  bio?: string;
  tradingPlatform?: string;
  instruments?: string;
  strategyDescription?: string;
  riskLevel?: string;
  typicalHoldTime?: string;
}
