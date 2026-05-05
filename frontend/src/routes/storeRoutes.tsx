import React, { Suspense, lazy } from "react";
import StoreLayout from "@/screens/store/layout";
import { ProtectRoute } from "./guards/ProtectRoute";

const StoreListing   = lazy(() => import("@/screens/store/listings"));
const Single         = lazy(() => import("@/screens/store/single"));
const Cart           = lazy(() => import("@/screens/store/cart"));
const Checkout       = lazy(() => import("@/screens/store/checkout"));
const Reviews        = lazy(() => import("@/screens/store/reviews"));
const PaymentSuccess = lazy(() => import("@/screens/store/payment/Success"));
const PaymentFailed  = lazy(() => import("@/screens/store/payment/Failed"));
const BuyerProfile   = lazy(() => import("@/screens/store/profile"));

const Fallback = () => <></>;

export const storeRoutes = [
  {
    path: "/store/:id",
    element: <StoreLayout />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<Fallback />}><StoreListing /></Suspense>,
      },
      {
        path: "product/:productId",
        element: <Suspense fallback={<Fallback />}><Single /></Suspense>,
      },
      {
        path: "cart/:cartId",
        element: (
          <ProtectRoute allowedRoles={["BUYER"]}>
            <Suspense fallback={<Fallback />}><Cart /></Suspense>
          </ProtectRoute>
        ),
      },
      {
        path: "checkout/:cartId",
        element: (
          <ProtectRoute allowedRoles={["BUYER"]}>
            <Suspense fallback={<Fallback />}><Checkout /></Suspense>
          </ProtectRoute>
        ),
      },
      {
        path: "reviews/:productId",
        element: <Suspense fallback={<Fallback />}><Reviews /></Suspense>,
      },
      {
        path: "payment/success",
        element: <Suspense fallback={<Fallback />}><PaymentSuccess /></Suspense>,
      },
      {
        path: "payment/failed",
        element: <Suspense fallback={<Fallback />}><PaymentFailed /></Suspense>,
      },
      {
        path: "profile",
        element: (
          <ProtectRoute allowedRoles={["BUYER"]}>
            <Suspense fallback={<Fallback />}><BuyerProfile /></Suspense>
          </ProtectRoute>
        ),
      },
    ],
  },
];