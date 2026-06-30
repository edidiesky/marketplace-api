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


export type UserType =
  | "seller:admin"
  | "seller:member"
  | "seller:viewer"
  | "platform:admin"
  | "platform:staff"
  | "customer"
  | "investor"
  | "advisor"
  | "system";

export interface RegisterPayload {
  email:     string;
  firstName: string;
  lastName:  string;
  userType:  UserType;
  phone:     string;
  address?:  string;
  gender?:   "Male" | "Female";
}


export interface InitiateOnboardingPayload {
  email: string;
  password: string;
  notificationId?: string;
}
export interface ChangePasswordPayload {
  newPassword: string;
  currentPassword:string
}

export interface ConfirmEmailPayload {
  token: string;
  email: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface RegisterResponse {
  success:      true;
  data: {
    userId:           string;
    email:            string;
    userType:         string;
    organizationType: string;
  };
  accessToken:  string;
  refreshToken: string;
  message:      string;
}

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    initiateOnboarding: builder.mutation<ApiSuccessResponse, InitiateOnboardingPayload>({
      query: (body) => ({
        method: "POST",
        url: `${AUTH_URL}/onboarding/initiate`,
        body,
      }),
    }),

    confirmEmail: builder.mutation<ApiSuccessResponse, ConfirmEmailPayload>({
      query: ({ token, email }) => ({
        method: "GET",
        url: `${AUTH_URL}/email/confirmation?token=${token}&email=${encodeURIComponent(email)}`,
      }),
    }),

    resendVerification: builder.mutation<ApiSuccessResponse, ResendVerificationPayload>({
      query: (body) => ({
        method: "POST",
        url: `${AUTH_URL}/onboarding/initiate`,
        body,
      }),
    }),

    register: builder.mutation<RegisterResponse, RegisterPayload>({
      query: (body) => ({
        method: "POST",
        url: `${AUTH_URL}/signup`,
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (body) => ({
        method: "POST",
        url: `${AUTH_URL}/login`,
        body,
      }),
    }),

    verifyOtp: builder.mutation<AuthResponse, VerifyOtpPayload>({
      query: (body) => ({
        method: "POST",
        url: `${AUTH_URL}/verify-otp`,
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    refreshToken: builder.mutation<AuthResponse, void>({
      query: () => ({
        method: "POST",
        url: `${AUTH_URL}/refresh-token`,
      }),
    }),

    logout: builder.mutation<ApiSuccessResponse, void>({
      query: () => ({
        method: "POST",
        url: `${AUTH_URL}/logout`,
      }),
      invalidatesTags: ["Auth", "Cart", "Order"],
    }),

    requestReset: builder.mutation<ApiSuccessResponse, RequestResetPayload>({
      query: (body) => ({
        method: "POST",
        url: `${AUTH_URL}/request-reset`,
        body,
      }),
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
  useConfirmEmailMutation,
  useResendVerificationMutation,
  useRegisterMutation,
  useLoginMutation,
  useVerifyOtpMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useRequestResetMutation,
  usePasswordResetMutation,
  useChangePasswordMutation,
} = authApiSlice;