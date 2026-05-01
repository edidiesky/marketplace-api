import { CART_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Cart, AddToCartPayload, UpdateCartItemPayload, ApiSuccessResponse } from "@/types/api";

export const cartApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    addToCart: builder.mutation<{ success: boolean; data: Cart }, { storeId: string } & AddToCartPayload>({
      query: ({ storeId, ...body }) => ({
        method: "POST",
        url: `${CART_URL}/${storeId}/store`,
        body,
      }),
      invalidatesTags: ["Cart"],
    }),
    getUserCart: builder.query<{ success: boolean; data: Cart }, string>({
      query: (storeId) => ({ method: "GET", url: `${CART_URL}/${storeId}/store` }),
      providesTags: ["Cart"],
    }),
    getAllStoreCarts: builder.query<{ success: boolean; data: Cart[] }, { storeId: string; page?: number; limit?: number }>({
      query: ({ storeId, ...params }) => ({
        method: "GET",
        url: `${CART_URL}/${storeId}/admin/carts`,
        params,
      }),
      providesTags: ["Cart"],
    }),
    getCart: builder.query<{ success: boolean; data: Cart }, string>({
      query: (id) => ({ method: "GET", url: `${CART_URL}/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Cart", id }],
    }),
    updateCartItem: builder.mutation<{ success: boolean; data: Cart }, { id: string } & UpdateCartItemPayload>({
      query: ({ id, ...body }) => ({ method: "PUT", url: `${CART_URL}/${id}`, body }),
      invalidatesTags: ["Cart"],
    }),
    deleteCartItem: builder.mutation<ApiSuccessResponse, { id: string; productId?: string }>({
      query: ({ id, ...body }) => ({ method: "DELETE", url: `${CART_URL}/${id}`, body }),
      invalidatesTags: ["Cart"],
    }),
  }),
});

export const {
  useAddToCartMutation,
  useGetUserCartQuery,
  useGetAllStoreCartsQuery,
  useGetCartQuery,
  useUpdateCartItemMutation,
  useDeleteCartItemMutation,
} = cartApiSlice;