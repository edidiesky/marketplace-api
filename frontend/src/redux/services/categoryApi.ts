import { CATEGORY_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { CategoryRow } from "@/components/dashboard/common/table/ProductTableList";

export interface CategoryListResponse {
  success: boolean;
  data: CategoryRow[];
}

export const categoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllStoreCategory: builder.query<CategoryListResponse, { storeid?: string }>({
      query: (data) => ({
        method: "GET",
        credentials: "include",
        url: `${CATEGORY_URL}/store/${data?.storeid}`,
      }),
      providesTags: ["Category"]
    }),
    createCategory: builder.mutation({
      query: ({ storeid, ...formdata }) => ({
        method: "POST",
        body: formdata,
        credentials: "include",
        url: `${CATEGORY_URL}/store/${storeid}`,
      }),
      invalidatesTags: ["Category"]
    }),
    getSingleCategory: builder.query({
      query: (categoryId) => {
        // console.log("query categoryId", categoryId)
        return {
          method: "GET",
          credentials: "include",
          url: `${CATEGORY_URL}/${categoryId}`,
        }
      },
      providesTags: ["Category"]

    }),
    updateCategory: builder.mutation({
      query: ({ categoryId, ...formdata }) => ({
        method: "PUT",
        body: formdata,
        credentials: "include",
        url: `${CATEGORY_URL}/${categoryId}`,
      }),
      invalidatesTags: ["Category"]
    }),
    deleteCategory: builder.mutation({
      query: (categoryId) => ({
        method: "DELETE",
        credentials: "include",
        url: `${CATEGORY_URL}/${categoryId}`,
      }),
      invalidatesTags: ["Category"]
    }),
  }),
});

export const {
  useGetAllStoreCategoryQuery,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
  useGetSingleCategoryQuery,
  useCreateCategoryMutation,
} = categoryApiSlice;