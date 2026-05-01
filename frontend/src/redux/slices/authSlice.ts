import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/redux/store";
import type { User } from "@/types/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  onboardingEmail: string | null;
  requiresOtp: boolean;
  pendingUserId: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  onboardingEmail: null,
  requiresOtp: false,
  pendingUserId: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.requiresOtp = false;
      state.pendingUserId = null;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.requiresOtp = false;
      state.pendingUserId = null;
      state.onboardingEmail = null;
    },
    setOnboardingEmail: (state, action: PayloadAction<string>) => {
      state.onboardingEmail = action.payload;
    },
    setOtpPending: (
      state,
      action: PayloadAction<{ pendingUserId: string }>
    ) => {
      state.requiresOtp = true;
      state.pendingUserId = action.payload.pendingUserId;
    },
    clearOtpPending: (state) => {
      state.requiresOtp = false;
      state.pendingUserId = null;
    },
  },
});

export const {
  setCredentials,
  clearCredentials,
  setOnboardingEmail,
  setOtpPending,
  clearOtpPending,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectOnboardingEmail = (state: RootState) => state.auth.onboardingEmail;
export const selectRequiresOtp = (state: RootState) => state.auth.requiresOtp;
export const selectPendingUserId = (state: RootState) => state.auth.pendingUserId;