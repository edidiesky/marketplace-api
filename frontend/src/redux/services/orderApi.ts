import { ORDER_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Order, PaginatedOrders } from "@/types/api";

export interface CheckoutPayload {
  cartId: string;
  requestId: string;
}

export interface ShippingPayload {
  fullName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  postalCode?: string;
}

export type FulfillmentStatus =
  | "unfulfilled"
  | "preparing"
  | "dispatched"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned";

export interface FulfillmentPayload {
  status: FulfillmentStatus;
  trackingNumber?: string;
  courierName?: string;
}

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /:storeId/checkout
    checkout: builder.mutation<{ success: boolean; data: Order }, { storeId: string } & CheckoutPayload>({
      query: ({ storeId, ...body }) => ({
        method: "POST",
        url: `${ORDER_URL}/${storeId}/checkout`,
        body,
      }),
      invalidatesTags: ["Order", "Cart", "Inventory"],
    }),

    addShipping: builder.mutation<{ success: boolean; data: Order }, { orderId: string } & ShippingPayload>({
      query: ({ orderId, ...body }) => ({
        method: "PATCH",
        url: `${ORDER_URL}/${orderId}/shipping`,
        body,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "Order", id: orderId }],
    }),

    // GET /:storeId/store: seller view of store orders
    getStoreOrders: builder.query<PaginatedOrders, { storeId: string; page?: number; limit?: number; orderStatus?: string; fulfillmentStatus?: string }>({
      query: ({ storeId, ...params }) => ({
        method: "GET",
        url: `${ORDER_URL}/${storeId}/store`,
        params,
      }),
      providesTags: ["Order"],
    }),

    // GET /me: buyer's own orders
    // Backend route is /me not /my-orders
    getMyOrders: builder.query<PaginatedOrders, { page?: number; limit?: number }>({
      query: (params) => ({
        method: "GET",
        url: `${ORDER_URL}/me`,
        params,
      }),
      providesTags: ["Order"],
    }),

    // GET /detail/:id: single order by ID
    getOrder: builder.query<{ success: boolean; data: Order }, string>({
      query: (id) => ({ method: "GET", url: `${ORDER_URL}/detail/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Order", id }],
    }),

    // PATCH /:orderId/fulfillment
    updateFulfillment: builder.mutation<{ success: boolean; data: Order }, { orderId: string } & FulfillmentPayload>({
      query: ({ orderId, ...body }) => ({
        method: "PATCH",
        url: `${ORDER_URL}/${orderId}/fulfillment`,
        body,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "Order", id: orderId }, "Order"],
    }),
  }),
});

export const {
  useCheckoutMutation,
  useAddShippingMutation,
  useGetStoreOrdersQuery,
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useUpdateFulfillmentMutation,
} = orderApiSlice;