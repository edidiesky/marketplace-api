import { COLOR_URL } from "@/constants";
import { apiSlice } from "./apiSlice";

export const colorApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllStoreColor: builder.query({
      query: (data) => ({
        method: "GET",
        credentials: "include",
        url: `${COLOR_URL}/store/${data?.storeid}`,
      }),
      providesTags: ["Color"],
    }),
    createColor: builder.mutation({
      query: ({ storeid, ...formdata }) => ({
        method: "POST",
        body: formdata,
        credentials: "include",
        url: `${COLOR_URL}/store/${storeid}`,
      }),
      invalidatesTags: ["Color"],
    }),
    getSingleColor: builder.query({
      query: (colorId) => ({
        method: "GET",
        credentials: "include",
        url: `${COLOR_URL}/${colorId}`,
      }),
      providesTags: ["Color"],
    }),
    updateColor: builder.mutation({
      query: ({ colorId, ...data }) => ({
        method: "PUT",
        body: data,
        credentials: "include",
        url: `${COLOR_URL}/${colorId}`,
      }),
      invalidatesTags: ["Color"],
    }),
    deleteColor: builder.mutation({
      query: (colorId) => ({
        method: "DELETE",
        credentials: "include",
        url: `${COLOR_URL}/${colorId}`,
      }),
      invalidatesTags: ["Color"],
    }),
  }),
});

export const {
  useGetAllStoreColorQuery,
  useDeleteColorMutation,
  useUpdateColorMutation,
  useGetSingleColorQuery,
  useCreateColorMutation,
} = colorApiSlice;
