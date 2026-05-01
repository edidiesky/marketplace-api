import { STORE_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Store, StoreListResponse, CreateStorePayload, UpdateStorePayload, ApiSuccessResponse } from "@/types/api";

export const storeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createStore: builder.mutation<{ success: boolean; data: Store }, CreateStorePayload>({
      query: (body) => ({ method: "POST", url: STORE_URL, body }),
      invalidatesTags: ["Store"],
    }),
    getAllStores: builder.query<StoreListResponse, { page?: number; limit?: number; isActive?: boolean; plan?: string }>({
      query: (params) => ({ method: "GET", url: STORE_URL, params }),
      providesTags: ["Store"],
    }),
    getStore: builder.query<{ success: boolean; data: Store }, string>({
      query: (id) => ({ method: "GET", url: `${STORE_URL}/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Store", id }],
    }),
    updateStore: builder.mutation<{ success: boolean; data: Store }, { id: string } & UpdateStorePayload>({
      query: ({ id, ...body }) => ({ method: "PUT", url: `${STORE_URL}/${id}`, body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Store", id }, "Store"],
    }),
    deleteStore: builder.mutation<ApiSuccessResponse, string>({
      query: (id) => ({ method: "DELETE", url: `${STORE_URL}/${id}` }),
      invalidatesTags: ["Store"],
    }),
  }),
});

export const {
  useCreateStoreMutation,
  useGetAllStoresQuery,
  useGetStoreQuery,
  useUpdateStoreMutation,
  useDeleteStoreMutation,
} = storeApiSlice;