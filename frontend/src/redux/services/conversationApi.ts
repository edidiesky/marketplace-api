
import { CONVERSATION_URL } from "@/constants";
import { apiSlice } from "./apiSlice";

export const conversationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllConversation: builder.query({
      query: (_data) => ({
        method: "GET",
        credentials: "include",
        url: `${CONVERSATION_URL}`,
      }),
    }),
    getSingleConversation: builder.query({
      query: (data) => ({
        method: "GET",
        credentials: "include",
        url: `${CONVERSATION_URL}/${data}`,
      }),
    }),
    createConversation: builder.mutation({
      query: (data) => ({
        method: "POST",
        body: data,
        credentials: "include",
        url: `${CONVERSATION_URL}`,
      }),
    }),
    adminDeleteConversation: builder.mutation({
      query: (data) => ({
        method: "DELETE",
        body: data,
        credentials: "include",
        url: `${CONVERSATION_URL}/admin/${data?.id}`,
      }),
    }),
  }),
});

export const {
  useGetAllConversationQuery,
  useGetSingleConversationQuery,
  useAdminDeleteConversationMutation,
  useCreateConversationMutation
} = conversationApiSlice;
