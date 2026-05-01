import { INVENTORY_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Inventory, InventoryListResponse, CreateInventoryPayload, InventoryAvailabilityResponse } from "@/types/api";

export const inventoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    checkInventory: builder.query<InventoryAvailabilityResponse, string>({
      query: (productId) => ({ method: "GET", url: `${INVENTORY_URL}/check/${productId}` }),
      providesTags: (_r, _e, id) => [{ type: "Inventory", id }],
    }),
    createInventory: builder.mutation<{ success: boolean; data: Inventory }, { storeId: string } & CreateInventoryPayload>({
      query: ({ storeId, ...body }) => ({
        method: "POST",
        url: `${INVENTORY_URL}/${storeId}/store`,
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    getAllStoreInventory: builder.query<InventoryListResponse, { storeId: string; page?: number; limit?: number }>({
      query: ({ storeId, ...params }) => ({
        method: "GET",
        url: `${INVENTORY_URL}/${storeId}/store`,
        params,
      }),
      providesTags: ["Inventory"],
    }),
    getInventory: builder.query<{ success: boolean; data: Inventory }, string>({
      query: (id) => ({ method: "GET", url: `${INVENTORY_URL}/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Inventory", id }],
    }),
    updateInventory: builder.mutation<{ success: boolean; data: Inventory }, { id: string; reorderPoint?: number; reorderQuantity?: number; warehouseName?: string }>({
      query: ({ id, ...body }) => ({ method: "PUT", url: `${INVENTORY_URL}/${id}`, body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Inventory", id }],
    }),
    deleteInventory: builder.mutation<{message:string}, string>({
      query: (id) => ({ method: "DELETE", url: `${INVENTORY_URL}/${id}` }),
      invalidatesTags: ["Inventory"],
    }),
  }),
});

export const {
  useCheckInventoryQuery,
  useCreateInventoryMutation,
  useGetAllStoreInventoryQuery,
  useGetInventoryQuery,
  useUpdateInventoryMutation,
  useDeleteInventoryMutation,
} = inventoryApiSlice;