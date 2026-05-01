import { USER_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { User, UserListResponse, UpdateUserPayload, UserQueryParams } from "@/types/api";

export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query<UserListResponse, UserQueryParams>({
      query: (params) => ({ method: "GET", url: USER_URL, params }),
      providesTags: ["User"],
    }),
    getAggregatedUsers: builder.query<{ success: boolean; data: unknown[] }, void>({
      query: () => ({ method: "GET", url: `${USER_URL}/aggregated-users/users` }),
      providesTags: ["User"],
    }),
    getUser: builder.query<{ success: boolean; data: User }, string>({
      query: (id) => ({ method: "GET", url: `${USER_URL}/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "User", id }],
    }),
    updateUser: builder.mutation<{ success: boolean; data: User }, { id: string } & UpdateUserPayload>({
      query: ({ id, ...body }) => ({ method: "PUT", url: `${USER_URL}/${id}`, body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "User", id }],
    }),
    deleteUser: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ method: "DELETE", url: `${USER_URL}/${id}` }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetAggregatedUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApiSlice;