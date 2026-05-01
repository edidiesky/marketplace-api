import { SIZE_URL } from "@/constants";
import { apiSlice } from "./apiSlice";

export const sizeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllStoreSize: builder.query({
      query: (data) => ({
        method: "GET",
        credentials: "include",
        url: `${SIZE_URL}/store/${data?.storeid}`,
      }),
      providesTags: ["Size"]
    }),
    createSize: builder.mutation({
      query: ({ storeid, ...formdata }) => ({
        method: "POST",
        body: formdata,
        credentials: "include",
        url: `${SIZE_URL}/store/${storeid}`,
      }),
      invalidatesTags: ["Size"]
    }),
    getSingleSize: builder.query({
      query: (sizeid) => ({
        method: "GET",
        credentials: "include",
        url: `${SIZE_URL}/${sizeid}`,
      }),
      providesTags: ["Size"]

    }),
    updateSize: builder.mutation({
      query: (data) => ({
        method: "PUT",
        body: data,
        credentials: "include",
        url: `${SIZE_URL}/${data?.id}`,
      }),
      invalidatesTags: ["Size"]
    }),
    deleteSize: builder.mutation({
      query: (deleteId) => ({
        method: "DELETE",
        credentials: "include",
        url: `${SIZE_URL}/${deleteId}`,
      }),
      invalidatesTags: ["Size"]
    }),
  }),
});

export const {
  useGetAllStoreSizeQuery,
  useDeleteSizeMutation,
  useUpdateSizeMutation,
  useGetSingleSizeQuery,
  useCreateSizeMutation,
} = sizeApiSlice;
