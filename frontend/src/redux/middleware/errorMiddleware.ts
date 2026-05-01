import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { showToast } from "@/components/common/Toast";
import formatRetryAfter from "@/utils/formatRetryAfter";

interface RejectedPayload {
  status: number;
  data?: {
    message?: string;
    error?: string;
    retryAfter?: string | number;
  };
}

interface RejectedActionMeta {
  arg?: {
    endpointName?: string;
  };
}

function isRejectedPayload(payload: unknown): payload is RejectedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "status" in payload &&
    typeof (payload as RejectedPayload).status === "number"
  );
}

function extractMessage(
  data: RejectedPayload["data"],
  fallback: string,
): string {
  return data?.message ?? data?.error ?? fallback;
}

export const rtkQueryErrorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const payload = action.payload;
    const meta = action.meta as RejectedActionMeta;

    if (!isRejectedPayload(payload)) {
      return next(action);
    }

    const { status, data } = payload;
    const endpointName = meta?.arg?.endpointName;

    switch (status) {
      case 400:
        showToast(
          extractMessage(
            data,
            "Invalid request. Please check your input and try again.",
          ),
          "error",
        );
        break;

      case 401:
        // auth flow handles redirect via baseQueryWithReauth + clearCredentials
        break;

      case 403:
        // silenced - uncomment if you want global 403 toasts
        break;

      case 404:
        showToast(
          extractMessage(data, "The requested resource was not found."),
          "error",
        );
        break;

      case 409:
        showToast(
          extractMessage(
            data,
            "A conflict occurred. This record may already exist.",
          ),
          "error",
        );
        break;

      case 422:
        showToast(
          extractMessage(data, "Validation failed. Please check your input."),
          "error",
        );
        break;

      case 429: {
        const label = endpointName
          ? `Your ${endpointName.replace(/([A-Z])/g, " $1").toLowerCase()} request was blocked.`
          : "Your request was blocked.";
        const message = data?.retryAfter
          ? `${label} Please wait ${formatRetryAfter(Number(data.retryAfter))} before trying again.`
          : `${label} You have exceeded the allowed limit. Please slow down.`;
        showToast(message, "error");
        break;
      }

      case 500:
        showToast(
          "An internal server error occurred. Please try again or contact support.",
          "error",
        );
        break;

      case 502:
        showToast(
          "A downstream service is unavailable. Please try again in a moment.",
          "error",
        );
        break;

      case 503:
        showToast(
          "The service is temporarily unavailable. Please try again later.",
          "error",
        );
        break;

      case 504:
        showToast(
          "The request timed out. Please check your connection and try again.",
          "error",
        );
        break;

      default:
        if (status >= 400) {
          showToast(
            extractMessage(
              data,
              "Something went wrong. Please try again or contact support.",
            ),
            "error",
          );
        }
        break;
    }
  }

  return next(action);
};
