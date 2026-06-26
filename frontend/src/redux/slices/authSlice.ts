import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/redux/store";
import type { User } from "@/types/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  onboardingEmail: string | null;
  requiresOtp: boolean;
  pendingUserId: string | null;
  onboardingStep: number;
  onboardingShowVerify: boolean;
  onboardingPendingEmail: string;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  onboardingEmail: null,
  requiresOtp: false,
  pendingUserId: null,
  onboardingStep: 1,
  onboardingShowVerify: false,
  onboardingPendingEmail: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action,
    ) => {
      state.user            = action.payload.user;
      state.accessToken     = action.payload.accessToken;
      state.refreshToken    = action.payload.refreshToken ?? state.refreshToken;
      state.isAuthenticated = true;
      state.requiresOtp     = false;
      state.pendingUserId   = null;

      // Persist to localStorage so tokens survive page reload
      try {
        localStorage.setItem("auth:accessToken",  action.payload.accessToken);
        if (action.payload.refreshToken) {
          localStorage.setItem("auth:refreshToken", action.payload.refreshToken);
        }
        localStorage.setItem("auth:user", JSON.stringify(action.payload.user));
      } catch { /* localStorage unavailable - continue without persistence */ }
    },

    clearCredentials: (state) => {
      state.user                   = null;
      state.accessToken            = null;
      state.refreshToken           = null;
      state.isAuthenticated        = false;
      state.requiresOtp            = false;
      state.pendingUserId          = null;
      state.onboardingEmail        = null;
      state.onboardingStep         = 1;
      state.onboardingShowVerify   = false;
      state.onboardingPendingEmail = "";

      try {
        localStorage.removeItem("auth:accessToken");
        localStorage.removeItem("auth:refreshToken");
        localStorage.removeItem("auth:user");
      } catch { /* ignore */ }
    },

    setOnboardingEmail: (state, action: PayloadAction<string>) => {
      state.onboardingEmail = action.payload;
    },

    setOtpPending: (
      state,
      action: PayloadAction<{ pendingUserId: string }>,
    ) => {
      state.requiresOtp = true;
      state.pendingUserId = action.payload.pendingUserId;
    },

    clearOtpPending: (state) => {
      state.requiresOtp = false;
      state.pendingUserId = null;
    },

    setOnboardingStep: (state, action: PayloadAction<number>) => {
      state.onboardingStep = action.payload;
    },

    setOnboardingShowVerify: (state, action: PayloadAction<boolean>) => {
      state.onboardingShowVerify = action.payload;
    },

    setOnboardingPendingEmail: (state, action: PayloadAction<string>) => {
      state.onboardingPendingEmail = action.payload;
    },

    resetOnboarding: (state) => {
      state.onboardingStep = 1;
      state.onboardingShowVerify = false;
      state.onboardingPendingEmail = "";
      state.onboardingEmail = null;
    },
  },
});

export const {
  setCredentials,
  clearCredentials,
  setOnboardingEmail,
  setOtpPending,
  clearOtpPending,
  setOnboardingStep,
  setOnboardingShowVerify,
  setOnboardingPendingEmail,
  resetOnboarding,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser          = (s: RootState) => s.auth.user;
export const selectIsAuthenticated      = (s: RootState) => s.auth.isAuthenticated;
export const selectAccessToken          = (s: RootState) => s.auth.accessToken;
export const selectRefreshToken         = (s: RootState) => s.auth.refreshToken;
export const selectOnboardingEmail      = (s: RootState) => s.auth.onboardingEmail;
export const selectRequiresOtp = (s: RootState) => s.auth.requiresOtp;
export const selectPendingUserId = (s: RootState) => s.auth.pendingUserId;
export const selectOnboardingStep = (s: RootState) => s.auth.onboardingStep;
export const selectOnboardingShowVerify = (s: RootState) =>
  s.auth.onboardingShowVerify;
export const selectOnboardingPendingEmail = (s: RootState) =>
  s.auth.onboardingPendingEmail;