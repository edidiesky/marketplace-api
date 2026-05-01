import { PRODUCT_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type {
  Product,
  ProductListResponse,
  CreateProductPayload,
  UpdateProductPayload,
  SearchProductsParams,
  AutocompleteResult,
  ApiSuccessResponse,
} from "@/types/api";

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchProducts: builder.query<ProductListResponse, SearchProductsParams>({
      query: (params) => ({
        method: "GET",
        url: `${PRODUCT_URL}/search`,
        params,
      }),
      providesTags: ["Product"],
    }),
    autocompleteProducts: builder.query<
      AutocompleteResult,
      { q: string; storeId?: string }
    >({
      query: (params) => ({
        method: "GET",
        url: `${PRODUCT_URL}/autocomplete`,
        params,
      }),
    }),
    getAllStoreProducts: builder.query<
      ProductListResponse,
      {
        storeid: string;
        page?: number;
        limit?: number;
        category?: string;
        isArchive?: boolean;
      }
    >({
      query: ({ storeid, ...params }) => ({
        method: "GET",
        url: `${PRODUCT_URL}/${storeid}/store`,
        params,
      }),
      providesTags: ["Product"],
    }),
    createProduct: builder.mutation<
      { success: boolean; data: Product },
      { storeid: string } & CreateProductPayload
    >({
      query: ({ storeid, ...body }) => ({
        method: "POST",
        url: `${PRODUCT_URL}/${storeid}/store`,
        body,
      }),
      invalidatesTags: ["Product", "Inventory"],
    }),
    getProduct: builder.query<{ success: boolean; data: Product }, string>({
      query: (id) => ({ method: "GET", url: `${PRODUCT_URL}/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Product", id }],
    }),
    updateProduct: builder.mutation<
      { success: boolean; data: Product },
      { id: string } & UpdateProductPayload
    >({
      query: ({ id, ...body }) => ({
        method: "PUT",
        url: `${PRODUCT_URL}/${id}`,
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Product", id }, "Product"],
    }),
    deleteProduct: builder.mutation<ApiSuccessResponse, string>({
      query: (id) => ({ method: "DELETE", url: `${PRODUCT_URL}/${id}` }),
      invalidatesTags: ["Product"],
    }),
    restoreProduct: builder.mutation<
      { success: boolean; data: Product },
      string
    >({
      query: (id) => ({ method: "POST", url: `${PRODUCT_URL}/${id}/restore` }),
      invalidatesTags: ["Product"],
    }),
  }),
});

export const {
  useSearchProductsQuery,
  useAutocompleteProductsQuery,
  useGetAllStoreProductsQuery,
  useCreateProductMutation,
  useGetProductQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useRestoreProductMutation,
} = productApiSlice;
