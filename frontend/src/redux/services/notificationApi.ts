import { NOTIFICATION_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { NotificationListResponse } from "@/types/api";

export const notificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationListResponse, { userId: string; page?: number; limit?: number; isRead?: boolean; type?: string }>({
      query: ({ userId, ...params }) => ({
        method: "GET",
        url: `${NOTIFICATION_URL}/${userId}`,
        params,
      }),
      providesTags: ["Notification"],
    }),
    markAsRead: builder.mutation<{ success: boolean }, string>({
      query: (notificationId) => ({
        method: "PATCH",
        url: `${NOTIFICATION_URL}/${notificationId}/read`,
      }),
      invalidatesTags: ["Notification"],
    }),
    markAllAsRead: builder.mutation<{ success: boolean }, string>({
      query: (userId) => ({
        method: "PATCH",
        url: `${NOTIFICATION_URL}/${userId}/read-all`,
      }),
      invalidatesTags: ["Notification"],
    }),
    deleteNotification: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ method: "DELETE", url: `${NOTIFICATION_URL}/${id}` }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} = notificationApiSlice;