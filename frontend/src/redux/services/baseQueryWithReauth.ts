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

function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  await refreshMutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  if (refreshMutex.isLocked()) {
    await refreshMutex.waitForUnlock();
    result = await rawBaseQuery(args, api, extraOptions);
    return result;
  }

  const release = await refreshMutex.acquire();

  try {
    const storedRefreshToken = (api.getState() as RootState).auth.refreshToken;

    if (!storedRefreshToken) {
      api.dispatch(clearCredentials());
      redirectToLogin();
      return result;
    }

    const refreshResult = await rawBaseQuery(
      {
        url:    `${AUTH_URL}/refresh-token`,
        method: "POST",
        body:   { refreshToken: storedRefreshToken },
        headers: { "Content-Type": "application/json" },
      },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      const data = refreshResult.data as {
        success:      boolean;
        accessToken:  string;
        refreshToken: string;
      };

      const currentUser = (api.getState() as RootState).auth.user;

      if (currentUser && data.accessToken) {
        api.dispatch(
          setCredentials({
            user:         currentUser,
            accessToken:  data.accessToken,
            refreshToken: data.refreshToken ?? storedRefreshToken,
          }),
        );
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(clearCredentials());
        redirectToLogin();
      }
    } else {
      api.dispatch(clearCredentials());
      redirectToLogin();
    }
  } finally {
    release();
  }

  return result;
};