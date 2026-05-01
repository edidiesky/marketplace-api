import { ORDER_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type {
  Order,
  PaginatedOrders,
  CheckoutPayload,
  ShippingPayload,
  FulfillmentPayload,
} from "@/types/api";

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    checkout: builder.mutation<
      { success: boolean; data: Order },
      { storeId: string } & CheckoutPayload
    >({
      query: ({ storeId, ...body }) => ({
        method: "POST",
        url: `${ORDER_URL}/${storeId}/checkout`,
        body,
      }),
      invalidatesTags: ["Order", "Cart", "Inventory"],
    }),

    getMyOrders: builder.query<
      PaginatedOrders,
      { page?: number; limit?: number }
    >({
      query: (params) => ({
        method: "GET",
        url: `${ORDER_URL}/my-orders`,
        params,
      }),
      providesTags: ["Order"],
    }),
    addShipping: builder.mutation<
      { success: boolean; data: Order },
      { orderId: string } & ShippingPayload
    >({
      query: ({ orderId, ...body }) => ({
        method: "PATCH",
        url: `${ORDER_URL}/${orderId}/shipping`,
        body,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Order", id: orderId },
      ],
    }),
    getStoreOrders: builder.query<
      PaginatedOrders,
      { storeId: string; page?: number; limit?: number; orderStatus?: string }
    >({
      query: ({ storeId, ...params }) => ({
        method: "GET",
        url: `${ORDER_URL}/${storeId}/store`,
        params,
      }),
      providesTags: ["Order"],
    }),
    getOrder: builder.query<{ success: boolean; data: Order }, string>({
      query: (id) => ({ method: "GET", url: `${ORDER_URL}/detail/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Order", id }],
    }),
    updateFulfillment: builder.mutation<
      { success: boolean; data: Order },
      { orderId: string } & FulfillmentPayload
    >({
      query: ({ orderId, ...body }) => ({
        method: "PATCH",
        url: `${ORDER_URL}/${orderId}/fulfillment`,
        body,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Order", id: orderId },
        "Order",
      ],
    }),
  }),
});

export const {
  useCheckoutMutation,
  useAddShippingMutation,
  useGetStoreOrdersQuery,
  useGetOrderQuery,
  useUpdateFulfillmentMutation,
  useGetMyOrdersQuery 
} = orderApiSlice;
