import { AUTH_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type {
  LoginPayload,
  VerifyOtpPayload,
  RequestResetPayload,
  PasswordResetPayload,
  AuthResponse,
  ApiSuccessResponse,
} from "@/types/api";

export interface InitiateOnboardingPayload {
  email: string;
  password: string;
  notificationId?: string;
}

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
  userType: "BUYER" | "SELLER";
  phone: string;
  address?: string;
  gender?: "Male" | "Female";
}

export interface ChangePasswordPayload {
  email: string;
  newPassword: string;
}

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    initiateOnboarding: builder.mutation<ApiSuccessResponse, InitiateOnboardingPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/onboarding/initiate`, body }),
    }),
    confirmEmailToken: builder.query<ApiSuccessResponse, string>({
      query: (token) => ({ method: "GET", url: `${AUTH_URL}/email/confirmation?token=${token}` }),
    }),
    register: builder.mutation<ApiSuccessResponse, RegisterPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/signup`, body }),
      invalidatesTags: ["Auth"],
    }),
    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/login`, body }),
    }),
    verifyOtp: builder.mutation<AuthResponse, VerifyOtpPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/verify-otp`, body }),
      invalidatesTags: ["Auth"],
    }),
    refreshToken: builder.mutation<AuthResponse, void>({
      query: () => ({ method: "POST", url: `${AUTH_URL}/refresh-token` }),
    }),
    logout: builder.mutation<ApiSuccessResponse, void>({
      query: () => ({ method: "POST", url: `${AUTH_URL}/logout` }),
      invalidatesTags: ["Auth", "Cart", "Order"],
    }),
    requestReset: builder.mutation<ApiSuccessResponse, RequestResetPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/request-reset`, body }),
    }),
    passwordReset: builder.mutation<ApiSuccessResponse, PasswordResetPayload>({
      query: ({ token, password }) => ({
        method: "POST",
        url: `${AUTH_URL}/password-reset`,
        body: { token, newPassword: password },
      }),
    }),
    changePassword: builder.mutation<ApiSuccessResponse, ChangePasswordPayload>({
      query: (body) => ({
        method: "POST",
        url: `${AUTH_URL}/password-change`,
        body,
      }),
    }),
  }),
});

export const {
  useInitiateOnboardingMutation,
  useConfirmEmailTokenQuery,
  useRegisterMutation,
  useLoginMutation,
  useVerifyOtpMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useRequestResetMutation,
  usePasswordResetMutation,
  useChangePasswordMutation,
} = authApiSlice;