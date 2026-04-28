import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/** Persisted user JSON (same key as pre-JWT for continuity). */
export const AUTH_USER_STORAGE_KEY = "tsp_user";

/** Bearer access token from POST /auth/login | /auth/register. */
export const AUTH_ACCESS_TOKEN_STORAGE_KEY = "tsp_access_token";

interface AuthState {
  user: {
    id: string;
    email: string;
    fullName?: string;
    role: "MASTER" | "SLAVE" | "ADMIN" | null;
    licenseKey?: string | null;
    subscribedToId?: string | null;
  } | null;
  /** JWT access token; sent as Authorization Bearer on API calls. */
  accessToken: string | null;
  isAuthenticated: boolean;
  /** Set true after client localStorage rehydration so guards do not redirect early. */
  rehydratedFromStorage: boolean;
}

export type LoginSuccessPayload = {
  user: NonNullable<AuthState["user"]>;
  /** Omit when refreshing user fields only (subscription); keeps existing token. */
  accessToken?: string | null;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  rehydratedFromStorage: false,
};

function persistAuth(state: AuthState) {
  if (typeof window === "undefined") return;

  if (state.user) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(state.user));
  } else {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  if (state.accessToken) {
    localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, state.accessToken);
  } else {
    localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<LoginSuccessPayload>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.rehydratedFromStorage = true;

      if (action.payload.accessToken !== undefined) {
        state.accessToken = action.payload.accessToken ?? null;
      }

      persistAuth(state);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.rehydratedFromStorage = true;

      if (typeof window !== "undefined") {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
      }
    },
    hydrateAuth: (state) => {
      if (typeof window === "undefined") {
        return;
      }

      const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);

      if (storedUser && storedToken) {
        try {
          state.user = JSON.parse(storedUser) as AuthState["user"];
          state.accessToken = storedToken;
          state.isAuthenticated = Boolean(state.user);
        } catch (error) {
          console.error("Failed to hydrate auth state", error);
          localStorage.removeItem(AUTH_USER_STORAGE_KEY);
          localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
          state.user = null;
          state.accessToken = null;
          state.isAuthenticated = false;
        }
      } else {
        if (storedUser && !storedToken) {
          localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        }
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      }

      state.rehydratedFromStorage = true;
    },
  },
});

export const { loginSuccess, logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
