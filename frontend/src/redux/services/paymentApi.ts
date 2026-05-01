import { PAYMENT_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Payment, PaymentHistoryResponse, InitializePaymentPayload, RefundPayload } from "@/types/api";

export const paymentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    initializePayment: builder.mutation<{ success: boolean; data: Payment }, InitializePaymentPayload>({
      query: (body) => ({ method: "POST", url: `${PAYMENT_URL}/initialize`, body }),
      invalidatesTags: ["Payment", "Order"],
    }),
    getPaymentHistory: builder.query<PaymentHistoryResponse, { page?: number; limit?: number; status?: string; gateway?: string; startDate?: string; endDate?: string; orderId?: string }>({
      query: (params) => ({ method: "GET", url: `${PAYMENT_URL}/history`, params }),
      providesTags: ["Payment"],
    }),
    getPayment: builder.query<{ success: boolean; data: Payment }, string>({
      query: (id) => ({ method: "GET", url: `${PAYMENT_URL}/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Payment", id }],
    }),
    initiateRefund: builder.mutation<{ success: boolean; data: Payment }, { paymentId: string } & RefundPayload>({
      query: ({ paymentId, ...body }) => ({
        method: "POST",
        url: `${PAYMENT_URL}/${paymentId}/refund`,
        body,
      }),
      invalidatesTags: ["Payment"],
    }),
  }),
});

export const {
  useInitializePaymentMutation,
  useGetPaymentHistoryQuery,
  useGetPaymentQuery,
  useInitiateRefundMutation,
} = paymentApiSlice;