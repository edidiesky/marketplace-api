import { AUTH_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type {
  LoginPayload, VerifyOtpPayload, RegisterPayload,
  AuthResponse, OnboardingEmailPayload, OnboardingPasswordPayload,
  RequestResetPayload, PasswordResetPayload, ChangePasswordPayload,
  ApiSuccessResponse,
} from "@/types/api";

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    verifyEmail: builder.mutation<ApiSuccessResponse, OnboardingEmailPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/verify-email`, body }),
    }),
    confirmEmailToken: builder.query<ApiSuccessResponse, string>({
      query: (token) => ({ method: "GET", url: `${AUTH_URL}/email/confirmation?token=${token}` }),
    }),
    verifyPassword: builder.mutation<ApiSuccessResponse, OnboardingPasswordPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/verify-password`, body }),
    }),
    register: builder.mutation<ApiSuccessResponse, RegisterPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/signup`, body }),
    }),
    login: builder.mutation<ApiSuccessResponse, LoginPayload>({
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
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/password-reset`, body }),
    }),
    changePassword: builder.mutation<ApiSuccessResponse, ChangePasswordPayload>({
      query: (body) => ({ method: "POST", url: `${AUTH_URL}/password-change`, body }),
    }),
  }),
});

export const {
  useVerifyEmailMutation,
  useConfirmEmailTokenQuery,
  useVerifyPasswordMutation,
  useRegisterMutation,
  useLoginMutation,
  useVerifyOtpMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useRequestResetMutation,
  usePasswordResetMutation,
  useChangePasswordMutation,
} = authApiSlice;