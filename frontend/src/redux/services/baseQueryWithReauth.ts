import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";
import type { RootState } from "@/redux/store";
import { setCredentials, clearCredentials } from "@/redux/slices/authSlice";
import { AUTH_URL } from "@/constants";

// I made use of Single mutex to prevent concurrent refresh calls
const refreshMutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Wait if a refresh is already in progress
  await refreshMutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  // 401 received - attempt refresh
  if (refreshMutex.isLocked()) {
    // Another request already triggered refresh, wait and retry with new token
    await refreshMutex.waitForUnlock();
    result = await rawBaseQuery(args, api, extraOptions);
    return result;
  }

  const release = await refreshMutex.acquire();

  try {
    const refreshResult = await rawBaseQuery(
      { url: `${AUTH_URL}/refresh-token`, method: "POST" },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      const data = refreshResult.data as {
        success: boolean;
        data: { accessToken: string };
      };
      const currentUser = (api.getState() as RootState).auth.user;

      if (currentUser) {
        api.dispatch(
          setCredentials({
            user: currentUser,
            accessToken: data.data.accessToken,
          }),
        );
      }

      // Retry original request with new token
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // logout if the refersh token has been tampered.
      api.dispatch(clearCredentials());
    }
  } finally {
    release();
  }

  return result;
};
