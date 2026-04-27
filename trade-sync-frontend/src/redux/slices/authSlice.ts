import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const AUTH_STORAGE_KEY = "tsp_user";

interface AuthState {
  user: {
    id: string;
    email: string;
    fullName?: string; // Added
    role: "MASTER" | "SLAVE" | "ADMIN" | null;
    licenseKey?: string | null;
    subscribedToId?: string | null; // Added for the Marketplace
  } | null;
  isAuthenticated: boolean;
  /** Set true after client localStorage rehydration so guards do not redirect early. */
  rehydratedFromStorage: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  rehydratedFromStorage: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<AuthState["user"]>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.rehydratedFromStorage = true;

      if (typeof window !== "undefined" && action.payload) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(action.payload));
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.rehydratedFromStorage = true;

      if (typeof window !== "undefined") {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    },
    hydrateAuth: (state) => {
      if (typeof window === "undefined") {
        return;
      }

      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);

      if (storedUser) {
        try {
          state.user = JSON.parse(storedUser) as AuthState["user"];
          state.isAuthenticated = Boolean(state.user);
        } catch (error) {
          console.error("Failed to hydrate auth state", error);
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }

      state.rehydratedFromStorage = true;
    },
  },
});

export const { loginSuccess, logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
