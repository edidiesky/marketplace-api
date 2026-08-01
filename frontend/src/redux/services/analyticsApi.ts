import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import { ORDER_URL, PAYMENT_URL, INVENTORY_URL, PRODUCT_URL } from "@/constants";
import type { OrderStatsResponse, OrderAnalyticsResponse, PaymentStatsResponse, PaymentAnalyticsResponse, InventoryAnalyticsResponse, ProductAnalyticsResponse } from "@/types/api";

export const analyticsApiSlice = createApi({
  reducerPath: "analyticsApi",
  baseQuery: baseQueryWithReauth,
  // Analytics reads are safe to sit stale for a minute, no urgency to
  // dispose of cache entries the second the tab unmounts either, a
  // switch back to the tab a few seconds later shouldn't re-fetch.
  keepUnusedDataFor: 60,
  tagTypes: ["OrderAnalytics"],
  endpoints: (builder) => ({
    // GET /:storeId/stats — order counts grouped by orderStatus
    getOrderStats: builder.query<OrderStatsResponse, { storeId: string }>({
      query: ({ storeId }) => ({
        method: "GET",
        url: `${ORDER_URL}/${storeId}/stats`,
      }),
      providesTags: ["OrderAnalytics"],
    }),

    // GET /:storeId/analytics — orders-over-time+avg-value,
    // fulfillment rate, day-of-week distribution, repeat-vs-new
    getOrderAnalytics: builder.query<
      OrderAnalyticsResponse,
      { storeId: string; range?: "7-days" | "3-weeks" | "3-months" }
    >({
      query: ({ storeId, range }) => ({
        method: "GET",
        url: `${ORDER_URL}/${storeId}/analytics`,
        params: range ? { range } : undefined,
      }),
      providesTags: ["OrderAnalytics"],
    }),

    // GET /stats/:storeId — aggregate totals (totalAmount,
    // successful/failed/pending counts) for a trailing N-day window.
    // Distinct from getPaymentAnalytics below: this is one snapshot
    // number, that's a full time series. useHomeOverview needs this
    // one specifically for the Total Revenue stat card.
    getPaymentStats: builder.query<PaymentStatsResponse, { storeId: string; days?: number }>({
      query: ({ storeId, days }) => ({
        method: "GET",
        url: `${PAYMENT_URL}/stats/${storeId}`,
        params: days ? { days } : undefined,
      }),
      providesTags: ["OrderAnalytics"],
    }),

    getPaymentAnalytics: builder.query<
      PaymentAnalyticsResponse,
      { storeId: string; range?: "7-days" | "3-weeks" | "3-months" }
    >({
      query: ({ storeId, range }) => ({
        method: "GET",
        url: `${PAYMENT_URL}/analytics/${storeId}`,
        params: range ? { range } : undefined,
      }),
      providesTags: ["OrderAnalytics"],
    }),

    getInventoryAnalytics: builder.query<
      InventoryAnalyticsResponse,
      { storeId: string; range?: "7-days" | "3-weeks" | "3-months" }
    >({
      query: ({ storeId, range }) => ({
        method: "GET",
        url: `${INVENTORY_URL}/analytics/${storeId}`,
        params: range ? { range } : undefined,
      }),
      providesTags: ["OrderAnalytics"],
    }),

    getProductAnalytics: builder.query<ProductAnalyticsResponse, { storeId: string }>({
      query: ({ storeId }) => ({
        method: "GET",
        url: `${PRODUCT_URL}/analytics/${storeId}`,
      }),
      providesTags: ["OrderAnalytics"],
    }),
  }),
});

export const {
  useGetOrderStatsQuery,
  useGetOrderAnalyticsQuery,
  useGetPaymentStatsQuery,
  useGetPaymentAnalyticsQuery,
  useGetInventoryAnalyticsQuery,
  useGetProductAnalyticsQuery,
} = analyticsApiSlice;