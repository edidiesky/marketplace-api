import React, { Suspense, lazy } from "react";
import MainLayout from "@/screens/layout";
const PaymentCallback = lazy(() => import("@/screens/store/payment/Callback"));
const Home = lazy(() => import("@/screens/Home"));
const NotFound = lazy(() => import("@/screens/NotFound"));
const Unauthorized = lazy(() => import("@/screens/Unauthorized"));

export const guestRoutes = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<></>}>
            <Home />
          </Suspense>
        ),
      },
    ],
  },
  {
  path: "/payment/callback",
  element: (
    <Suspense fallback={<></>}>
      <PaymentCallback />
    </Suspense>
  ),
},
  {
    path: "/unauthorized",
    element: (
      <Suspense fallback={<></>}>
        <Unauthorized />
      </Suspense>
    ),
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<></>}>
        <NotFound />
      </Suspense>
    ),
  },
];