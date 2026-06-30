import React, { Suspense, lazy } from "react";
import DashboardLayout from "@/screens/dashboard/layout";
import { ProtectRoute } from "./guards/ProtectRoute";
import Payments from "@/screens/dashboard/payments";
import PageLoader from "@/components/common/PageLoader";

const DashboardHome = lazy(() => import("@/screens/dashboard/home"));
const Products      = lazy(() => import("@/screens/dashboard/products"));
const Orders        = lazy(() => import("@/screens/dashboard/orders"));
const Inventory     = lazy(() => import("@/screens/dashboard/inventory"));
const Customers     = lazy(() => import("@/screens/dashboard/customers"));
const Analytics     = lazy(() => import("@/screens/dashboard/analytics"));
const Messages      = lazy(() => import("@/screens/dashboard/messages"));
const Marketing     = lazy(() => import("@/screens/dashboard/marketing"));
const Categories    = lazy(() => import("@/screens/dashboard/categories"));
const Colors        = lazy(() => import("@/screens/dashboard/colors"));
const Sizes         = lazy(() => import("@/screens/dashboard/size"));
const Account       = lazy(() => import("@/screens/dashboard/account"));
const Payouts       = lazy(() => import("@/screens/dashboard/payouts"));
const Fallback = () => <PageLoader/>;
export const dashboardRoutes = [
  {
    path: "/dashboard/store/:id",
    element: (
      <ProtectRoute>
        <DashboardLayout />
      </ProtectRoute>
    ),
    children: [
      {
        index: true,
        element: <Suspense fallback={Fallback()}><DashboardHome /></Suspense>,
      },
      {
        path: "products",
        element: <Suspense fallback={Fallback()}><Products /></Suspense>,
      },
      {
        path: "orders",
        element: <Suspense fallback={Fallback()}><Orders /></Suspense>,
      },
      {
        path: "inventory",
        element: <Suspense fallback={Fallback()}><Inventory /></Suspense>,
      },
      {
        path: "payments",
        element: <Suspense fallback={Fallback()}><Payments /></Suspense>,
      },
      {
        path: "customers",
        element: <Suspense fallback={Fallback()}><Customers /></Suspense>,
      },
      {
        path: "analytics",
        element: <Suspense fallback={Fallback()}><Analytics /></Suspense>,
      },
      {
        path: "messages",
        element: <Suspense fallback={Fallback()}><Messages /></Suspense>,
      },
      {
        path: "marketing",
        element: <Suspense fallback={Fallback()}><Marketing /></Suspense>,
      },
      {
        path: "categories",
        element: <Suspense fallback={Fallback()}><Categories /></Suspense>,
      },
      {
        path: "colors",
        element: <Suspense fallback={Fallback()}><Colors /></Suspense>,
      },
      {
        path: "sizes",
        element: <Suspense fallback={Fallback()}><Sizes /></Suspense>,
      },
      {
        path: "account",
        element: <Suspense fallback={Fallback()}><Account /></Suspense>,
      },
      {
        path: "payouts",
        element: <Suspense fallback={Fallback()}><Payouts /></Suspense>,
      },
    ],
  },
];