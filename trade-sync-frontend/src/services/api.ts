import axios from "axios";

const API_URL = "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export interface MasterProfile {
  id: string;
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
  licenseKey?: string;
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
  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  register: async (userData: RegisterUserData) => {
    const response = await api.post("/auth/register", userData);
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
