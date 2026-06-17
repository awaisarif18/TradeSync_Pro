import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  clearSession,
  isJwtExpired,
  readSession,
  setSession,
} from "@/lib/authStorage";

export { AUTH_ACCESS_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from "@/lib/authStorage";

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
  /** When true, session is stored in localStorage; otherwise sessionStorage. */
  rememberMe: boolean;
  /** Set true after client storage rehydration so guards do not redirect early. */
  rehydratedFromStorage: boolean;
}

export type LoginSuccessPayload = {
  user: NonNullable<AuthState["user"]>;
  /** Omit when refreshing user fields only (subscription); keeps existing token. */
  accessToken?: string | null;
  /** Omit on subscription updates; defaults to true when a new token is issued. */
  rememberMe?: boolean;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  rememberMe: true,
  rehydratedFromStorage: false,
};

function persistAuth(state: AuthState) {
  if (typeof window === "undefined") return;

  if (state.user && state.accessToken) {
    setSession(state.rememberMe, {
      user: state.user,
      token: state.accessToken,
    });
  } else {
    clearSession();
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
        if (action.payload.rememberMe !== undefined) {
          state.rememberMe = action.payload.rememberMe;
        } else {
          state.rememberMe = true;
        }
      }

      persistAuth(state);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.rememberMe = true;
      state.rehydratedFromStorage = true;

      clearSession();
    },
    hydrateAuth: (state) => {
      if (typeof window === "undefined") {
        return;
      }

      const session = readSession();

      if (session) {
        if (isJwtExpired(session.token)) {
          clearSession();
          state.user = null;
          state.accessToken = null;
          state.isAuthenticated = false;
          state.rememberMe = true;
        } else {
          state.user = session.user;
          state.accessToken = session.token;
          state.isAuthenticated = Boolean(session.user);
          state.rememberMe = session.remember;
        }
      } else {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.rememberMe = true;
      }

      state.rehydratedFromStorage = true;
    },
  },
});

export const { loginSuccess, logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
