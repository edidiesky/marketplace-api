import React, { Suspense, lazy } from "react";
import { GuestOnlyRoute } from "./guards/GuestOnlyRoute";

const Login = lazy(() => import("@/screens/auth/login"));
const VerifyOtp = lazy(() => import("@/screens/auth/VerifyOtp"));
const Onboarding = lazy(() => import("@/screens/auth/onboarding"));
const ResetPassword = lazy(() => import("@/screens/auth/ResetPassword"));
const NewPassword = lazy(() => import("@/screens/auth/NewPassword"));

export const authRoutes = [
  {
    path: "/login",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}>
          <Login />
        </Suspense>
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/verify-otp",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}>
          <VerifyOtp />
        </Suspense>
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <Suspense fallback={<></>}>
        <Onboarding />
      </Suspense>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}>
          <ResetPassword />
        </Suspense>
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/reset-password/:token",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}>
          <NewPassword />
        </Suspense>
      </GuestOnlyRoute>
    ),
  },
];
