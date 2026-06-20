import { CART_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Cart, ApiSuccessResponse } from "@/types/api";


export interface AddToCartPayload {
  productId: string;
  productTitle: string;
  productImage: string[];
  productPrice: number;
  productDescription?: string;
  quantity?: number;
  sellerId: string;
  email?: string;
  idempotencyKey?: string;
}
export interface UpdateCartItemPayload {
  productId: string;
  quantity: number;
}
export interface DeleteCartItemPayload {
  productId: string;
}

export const cartApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /:storeId/store
    addToCart: builder.mutation<{ success: boolean; data: Cart }, { storeId: string } & AddToCartPayload>({
      query: ({ storeId, ...body }) => ({
        method: "POST",
        url: `${CART_URL}/${storeId}/store`,
        body,
      }),
      invalidatesTags: ["Cart"],
    }),

    // GET /:storeId/store — gets the current user's active cart for this store
    getUserCart: builder.query<{ success: boolean; data: Cart }, string>({
      query: (storeId) => ({ method: "GET", url: `${CART_URL}/${storeId}/store` }),
      providesTags: ["Cart"],
    }),

    // GET /:storeId/admin/carts — seller/admin view of all store carts
    getAllStoreCarts: builder.query<{ success: boolean; data: Cart[] }, { storeId: string; page?: number; limit?: number }>({
      query: ({ storeId, ...params }) => ({
        method: "GET",
        url: `${CART_URL}/${storeId}/admin/carts`,
        params,
      }),
      providesTags: ["Cart"],
    }),

    // GET /:cartId — fetch a specific cart by ID
    getCart: builder.query<{ success: boolean; data: Cart }, string>({
      query: (cartId) => ({ method: "GET", url: `${CART_URL}/${cartId}` }),
      providesTags: (_r, _e, id) => [{ type: "Cart", id }],
    }),

    // PATCH /:storeId/items — update quantity of an item in cart
    updateCartItem: builder.mutation<{ success: boolean; data: Cart }, { storeId: string } & UpdateCartItemPayload>({
      query: ({ storeId, ...body }) => ({
        method: "PATCH",
        url: `${CART_URL}/${storeId}/items`,
        body,
      }),
      invalidatesTags: ["Cart"],
    }),

    // DELETE /:storeId/items — remove an item from cart
    deleteCartItem: builder.mutation<ApiSuccessResponse, { storeId: string } & DeleteCartItemPayload>({
      query: ({ storeId, ...body }) => ({
        method: "DELETE",
        url: `${CART_URL}/${storeId}/items`,
        body,
      }),
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