import { UPLOAD_URL } from "@/constants";
import { apiSlice } from "./apiSlice";

export const uploadApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    uploadItem: builder.mutation({
      query: (data) => ({
        method: "POST",
        credentials: "include",
        body: data,
        url: `${UPLOAD_URL}`,
      }),
    }),
  }),
});

export const { useUploadItemMutation } = uploadApiSlice;
