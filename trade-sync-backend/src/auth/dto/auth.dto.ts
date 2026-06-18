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
  /** Public path with optional ?v= cache-bust query, e.g. /uploads/avatars/{id}.png?v=... */
  avatarUrl?: string | null;
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

// --- OTP / PASSWORD RESET DTOs ---

export type OtpPurposeDto = 'SIGNUP' | 'PASSWORD_RESET';

export class RegisterResponseDto {
  message: string;
  email: string;
  requiresOtp: true;
}

export class VerifySignupOtpDto {
  email: string;
  code: string;
}

export class ResendOtpDto {
  email: string;
  purpose: OtpPurposeDto;
}

export class RequestPasswordResetDto {
  email: string;
}

export class VerifyResetOtpDto {
  email: string;
  code: string;
}

export class VerifyResetOtpResponseDto {
  resetToken: string;
}

export class ConfirmPasswordResetDto {
  resetToken: string;
  newPassword: string;
}

export class GenericMessageDto {
  message: string;
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
