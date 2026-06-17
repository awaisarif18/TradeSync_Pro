import axios from "axios";
import {
  AUTH_ACCESS_TOKEN_STORAGE_KEY,
  logout,
} from "../redux/slices/authSlice";
import { store } from "../redux/slices/store";

const API_URL = "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const token = localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }
    const axiosError = error as {
      response?: { status?: number };
      config?: { url?: string };
    };
    const status = axiosError.response?.status;
    const url = axiosError.config?.url ?? "";
    if (status === 401) {
      const isAuthEntry =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/otp/") ||
        url.includes("/auth/password-reset/");
      if (!isAuthEntry) {
        store.dispatch(logout());
      }
    }
    return Promise.reject(error);
  },
);

export interface MasterRiskMetrics {
  maxDrawdownPercent: number;
  avgTradesPerDay: number;
  longestLosingStreakTrades: number;
  bestDayPnl: number;
}

export interface MasterProfile {
  id: string;
  email?: string;
  fullName: string;
  createdAt: string;
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  avgVolume: number;
  totalPnL: number;
  bio: string | null;
  tradingPlatform: string | null;
  instruments: string | null;
  strategyDescription: string | null;
  riskLevel: string | null;
  typicalHoldTime: string | null;
  subscriberCount: number;
  isLive: boolean;
  riskMetrics?: MasterRiskMetrics;
  equitySparkline?: number[];
  activeHoursSummary?: string | null;
}

export interface UpdateMasterProfileDto {
  bio?: string;
  tradingPlatform?: string;
  instruments?: string;
  strategyDescription?: string;
  riskLevel?: string;
  typicalHoldTime?: string;
}

export interface RegisterUserData {
  fullName: string;
  email: string;
  password: string;
  role: "MASTER" | "SLAVE";
}

/** User object returned with JWT from login/register (password never included). */
export interface AuthSessionUser {
  id: string;
  email: string;
  fullName?: string;
  role: "MASTER" | "SLAVE" | "ADMIN";
  licenseKey?: string | null;
  subscribedToId?: string | null;
}

export interface AuthSessionResponse {
  access_token: string;
  user: AuthSessionUser;
}

export type OtpPurpose = "SIGNUP" | "PASSWORD_RESET";

/** New shape returned by POST /auth/register (no token until OTP verified). */
export interface RegisterResponse {
  message: string;
  email: string;
  requiresOtp: true;
}

export interface GenericMessageResponse {
  message: string;
}

export interface VerifyResetOtpResponse {
  resetToken: string;
}

export interface MasterProfileUpdateResult {
  id: string;
  fullName: string;
  createdAt: string;
  bio: string | null;
  tradingPlatform: string | null;
  instruments: string | null;
  strategyDescription: string | null;
  riskLevel: string | null;
  typicalHoldTime: string | null;
}

export interface MasterDashboardData {
  profile: MasterProfile;
  recentTrades: TradeHistoryEntry[];
  subscriberCount: number;
  openTrades: number;
  totalSignalsSent: number;
}

export interface TopMaster extends MasterProfile {
  openTrades: number;
}

export interface TradeHistoryEntry {
  id: string;
  symbol: string;
  action: string;
  volume: number;
  status: "OPEN" | "CLOSED";
  pnl: number | null;
  createdAt: string;
  closedAt: string | null;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthSessionResponse> => {
    const response = await api.post<AuthSessionResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  register: async (
    userData: RegisterUserData,
  ): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>(
      "/auth/register",
      userData,
    );
    return response.data;
  },

  verifySignupOtp: async (
    email: string,
    code: string,
  ): Promise<AuthSessionResponse> => {
    const response = await api.post<AuthSessionResponse>(
      "/auth/otp/verify-signup",
      { email, code },
    );
    return response.data;
  },

  resendOtp: async (
    email: string,
    purpose: OtpPurpose,
  ): Promise<GenericMessageResponse> => {
    const response = await api.post<GenericMessageResponse>("/auth/otp/resend", {
      email,
      purpose,
    });
    return response.data;
  },

  requestPasswordReset: async (
    email: string,
  ): Promise<GenericMessageResponse> => {
    const response = await api.post<GenericMessageResponse>(
      "/auth/password-reset/request",
      { email },
    );
    return response.data;
  },

  verifyResetOtp: async (
    email: string,
    code: string,
  ): Promise<VerifyResetOtpResponse> => {
    const response = await api.post<VerifyResetOtpResponse>(
      "/auth/password-reset/verify",
      { email, code },
    );
    return response.data;
  },

  confirmPasswordReset: async (
    resetToken: string,
    newPassword: string,
  ): Promise<GenericMessageResponse> => {
    const response = await api.post<GenericMessageResponse>(
      "/auth/password-reset/confirm",
      { resetToken, newPassword },
    );
    return response.data;
  },
};

// --- NEW ADMIN SERVICE ---
export const adminService = {
  getUsers: async () => {
    const response = await api.get("/auth/users");
    return response.data;
  },

  generateLicense: async (userId: string) => {
    const response = await api.post(`/auth/users/${userId}/license`);
    return response.data;
  },

  toggleUserStatus: async (userId: string) => {
    const response = await api.patch(`/auth/users/${userId}/toggle-status`);
    return response.data;
  },
};

// --- MARKETPLACE SERVICE ---
export const marketplaceService = {
  getActiveMasters: async () => {
    const response = await api.get("/auth/masters");
    return response.data;
  },

  getLiveMasters: async (): Promise<{ liveIds: string[] }> => {
    const response = await api.get("/auth/masters/live");
    return response.data;
  },

  getMasterProfile: async (masterId: string): Promise<MasterProfile> => {
    const response = await api.get(`/auth/masters/${masterId}/profile`);
    return response.data;
  },

  getMasterHistory: async (masterId: string): Promise<TradeHistoryEntry[]> => {
    const response = await api.get(`/trades/master/${masterId}/history`);
    return response.data;
  },

  updateSubscription: async (slaveId: string, masterId: string | null) => {
    const response = await api.patch(`/auth/users/${slaveId}/subscribe`, {
      masterId,
    });
    return response.data;
  },
};

export const profileService = {
  updateMasterProfile: async (
    masterId: string,
    dto: UpdateMasterProfileDto,
  ): Promise<MasterProfileUpdateResult> => {
    const response = await api.patch(`/auth/masters/${masterId}/profile`, dto);
    return response.data;
  },

  getMasterDashboard: async (
    masterId: string,
  ): Promise<MasterDashboardData> => {
    const response = await api.get(`/auth/masters/${masterId}/dashboard`);
    return response.data;
  },

  getTopMasters: async (): Promise<TopMaster[]> => {
    const response = await api.get("/auth/top-masters");
    return response.data;
  },

  getMasterProfile: async (masterId: string): Promise<MasterProfile> => {
    const response = await api.get(`/auth/masters/${masterId}/profile`);
    return response.data;
  },

  getMasterHistory: async (masterId: string): Promise<TradeHistoryEntry[]> => {
    const response = await api.get(`/trades/master/${masterId}/history`);
    return response.data;
  },
};
