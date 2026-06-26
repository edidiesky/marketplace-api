import React, { Suspense, lazy } from "react";
import { GuestOnlyRoute } from "./guards/GuestOnlyRoute";
import { ProtectRoute } from "./guards/ProtectRoute";

const Login         = lazy(() => import("@/screens/auth/login"));
const VerifyOtp     = lazy(() => import("@/screens/auth/VerifyOtp"));
const Onboarding    = lazy(() => import("@/screens/auth/onboarding"));
const VerifyEmail   = lazy(() => import("@/screens/auth/VerifyEmail"));
const ResetPassword = lazy(() => import("@/screens/auth/ResetPassword"));
const NewPassword   = lazy(() => import("@/screens/auth/NewPassword"));
const CreateStore   = lazy(() => import("@/screens/auth/CreateStore"));
const SelectStore   = lazy(() => import("@/screens/auth/SelectStore"));

export const authRoutes = [
  {
    path: "/login",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}><Login /></Suspense>
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/verify-otp",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}><VerifyOtp /></Suspense>
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <Suspense fallback={<></>}><Onboarding /></Suspense>
    ),
  },
  {
    path: "/onboarding/verify-email",
    element: (
      <Suspense fallback={<></>}><VerifyEmail /></Suspense>
    ),
  },
  {
    path: "/onboarding/create-store",
    element: (
      <ProtectRoute>
        <Suspense fallback={<></>}><CreateStore /></Suspense>
      </ProtectRoute>
    ),
  },
  {
    path: "/select-store",
    element: (
      <ProtectRoute>
        <Suspense fallback={<></>}><SelectStore /></Suspense>
      </ProtectRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}><ResetPassword /></Suspense>
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/reset-password/:token",
    element: (
      <GuestOnlyRoute>
        <Suspense fallback={<></>}><NewPassword /></Suspense>
      </GuestOnlyRoute>
    ),
  },
];