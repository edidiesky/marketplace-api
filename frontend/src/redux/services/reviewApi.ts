import { REVIEW_URL } from "@/constants";
import { apiSlice } from "./apiSlice";
import type { Review, ReviewListResponse, CreateReviewPayload, RespondToReviewPayload, ApiSuccessResponse } from "@/types/api";
export const reviewApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductReviews: builder.query<ReviewListResponse, string>({
      query: (productId) => ({ method: "GET", url: `${REVIEW_URL}/product/${productId}` }),
      providesTags: ["Review"],
    }),
    createReview: builder.mutation<{ success: boolean; data: Review }, CreateReviewPayload>({
      query: (body) => ({ method: "POST", url: REVIEW_URL, body }),
      invalidatesTags: ["Review"],
    }),
    markHelpful: builder.mutation<ApiSuccessResponse, string>({
      query: (reviewId) => ({ method: "POST", url: `${REVIEW_URL}/${reviewId}/helpful` }),
      invalidatesTags: ["Review"],
    }),
    respondToReview: builder.mutation<ApiSuccessResponse, { reviewId: string } & RespondToReviewPayload>({
      query: ({ reviewId, ...body }) => ({
        method: "POST",
        url: `${REVIEW_URL}/${reviewId}/respond`,
        body,
      }),
      invalidatesTags: ["Review"],
    }),
    approveReview: builder.mutation<ApiSuccessResponse, string>({
      query: (reviewId) => ({ method: "PATCH", url: `${REVIEW_URL}/${reviewId}/approve` }),
      invalidatesTags: ["Review"],
    }),
    rejectReview: builder.mutation<ApiSuccessResponse, string>({
      query: (reviewId) => ({ method: "PATCH", url: `${REVIEW_URL}/${reviewId}/reject` }),
      invalidatesTags: ["Review"],
    }),
  }),
});

export const {
  useGetProductReviewsQuery,
  useCreateReviewMutation,
  useMarkHelpfulMutation,
  useRespondToReviewMutation,
  useApproveReviewMutation,
  useRejectReviewMutation,
} = reviewApiSlice;