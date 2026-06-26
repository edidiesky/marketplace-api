import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./services/apiSlice";
import authReducer, { setCredentials } from "./slices/authSlice";
import modalReducer from "./slices/modalSlice";
import { rtkQueryErrorMiddleware } from "./middleware/errorMiddleware";

function loadPersistedAuth() {
  try {
    const accessToken  = localStorage.getItem("auth:accessToken");
    const refreshToken = localStorage.getItem("auth:refreshToken");
    const userRaw      = localStorage.getItem("auth:user");
    if (accessToken && refreshToken && userRaw) {
      return {
        accessToken,
        refreshToken,
        user: JSON.parse(userRaw),
      };
    }
  } catch {
    // corrupted localStorage - start clean
  }
  return null;
}

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    modals: modalReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      apiSlice.middleware,
      rtkQueryErrorMiddleware,
    ),
  devTools: import.meta.env.DEV,
});

const persisted = loadPersistedAuth();
if (persisted) {
  store.dispatch(
    setCredentials({
      user:         persisted.user,
      accessToken:  persisted.accessToken,
      refreshToken: persisted.refreshToken,
    }),
  );
}

export type RootState  = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;