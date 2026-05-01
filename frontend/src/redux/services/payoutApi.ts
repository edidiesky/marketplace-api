import { PAYOUT_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Payout, PayoutRequestPayload } from "@/types/api";

export const payoutApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    requestPayout: builder.mutation<{ success: boolean; data: Payout }, PayoutRequestPayload>({
      query: (body) => ({ method: "POST", url: PAYOUT_URL, body }),
      invalidatesTags: ["Payout", "Wallet"],
    }),
    getMyPayouts: builder.query<{ success: boolean; data: Payout[] }, { page?: number; limit?: number }>({
      query: (params) => ({ method: "GET", url: `${PAYOUT_URL}/me`, params }),
      providesTags: ["Payout"],
    }),
    getPendingPayouts: builder.query<{ success: boolean; data: Payout[] }, void>({
      query: () => ({ method: "GET", url: `${PAYOUT_URL}/pending` }),
      providesTags: ["Payout"],
    }),
    approvePayout: builder.mutation<{ success: boolean }, string>({
      query: (payoutRequestId) => ({
        method: "PATCH",
        url: `${PAYOUT_URL}/${payoutRequestId}/approve`,
      }),
      invalidatesTags: ["Payout"],
    }),
    rejectPayout: builder.mutation<{ success: boolean }, string>({
      query: (payoutRequestId) => ({
        method: "PATCH",
        url: `${PAYOUT_URL}/${payoutRequestId}/reject`,
      }),
      invalidatesTags: ["Payout"],
    }),
  }),
});

export const {
  useRequestPayoutMutation,
  useGetMyPayoutsQuery,
  useGetPendingPayoutsQuery,
  useApprovePayoutMutation,
  useRejectPayoutMutation,
} = payoutApiSlice;