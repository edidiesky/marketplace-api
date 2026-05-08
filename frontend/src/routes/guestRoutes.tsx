import React, { Suspense, lazy } from "react";
import MainLayout from "@/screens/layout";
const Home = lazy(() => import("@/screens/Home"));
const NotFound = lazy(() => import("@/screens/NotFound"));
const Unauthorized = lazy(() => import("@/screens/Unauthorized"));
const PaymentSuccess = lazy(() => import("@/screens/store/payment/Success"));
const PaymentFailed = lazy(() => import("@/screens/store/payment/Failed"));

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
    path: "/payment/success",
    element: (
      <Suspense fallback={<></>}>
        <PaymentSuccess />
      </Suspense>
    ),
  },
    {
    path: "/payment/failed",
    element: (
      <Suspense fallback={<></>}>
        <PaymentFailed />
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
