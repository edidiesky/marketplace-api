// src/routes/dashboardRoutes.tsx
import React, { Suspense, lazy } from "react";
import DashboardLayout from "@/screens/dashboard/layout";
import { ProtectRoute } from "./guards/ProtectRoute";

const DashboardHome = lazy(() => import("@/screens/dashboard/home"));
const Products = lazy(() => import("@/screens/dashboard/products"));
const Orders = lazy(() => import("@/screens/dashboard/orders"));
const Inventory = lazy(() => import("@/screens/dashboard/inventory"));
const Customers = lazy(() => import("@/screens/dashboard/customers"));
const Analytics = lazy(() => import("@/screens/dashboard/analytics"));
const Messages = lazy(() => import("@/screens/dashboard/messages"));
const Marketing = lazy(() => import("@/screens/dashboard/marketing"));
const Categories = lazy(() => import("@/screens/dashboard/categories"));
const Colors = lazy(() => import("@/screens/dashboard/colors"));
const Sizes = lazy(() => import("@/screens/dashboard/size"));
const Account = lazy(() => import("@/screens/dashboard/account"));
const Payouts = lazy(() => import("@/screens/dashboard/payouts"));

export const dashboardRoutes = [
  {
    path: "/dashboard/store/:id",
    element: (
      <ProtectRoute allowedRoles={["SELLER", "ADMIN"]}>
        <DashboardLayout />
      </ProtectRoute>
    ),
    children: [
      {
        index: true,
        element: <Suspense fallback={<></>}><DashboardHome /></Suspense>,
      },
      {
        path: "products",
        element: <Suspense fallback={<></>}><Products /></Suspense>,
      },
      {
        path: "orders",
        element: <Suspense fallback={<></>}><Orders /></Suspense>,
      },
      {
        path: "inventory",
        element: <Suspense fallback={<></>}><Inventory /></Suspense>,
      },
      {
        path: "customers",
        element: <Suspense fallback={<></>}><Customers /></Suspense>,
      },
      {
        path: "analytics",
        element: <Suspense fallback={<></>}><Analytics /></Suspense>,
      },
      {
        path: "messages",
        element: <Suspense fallback={<></>}><Messages /></Suspense>,
      },
      {
        path: "marketing",
        element: <Suspense fallback={<></>}><Marketing /></Suspense>,
      },
      {
        path: "categories",
        element: <Suspense fallback={<></>}><Categories /></Suspense>,
      },
      {
        path: "colors",
        element: <Suspense fallback={<></>}><Colors /></Suspense>,
      },
      {
        path: "sizes",
        element: <Suspense fallback={<></>}><Sizes /></Suspense>,
      },
      {
        path: "account",
        element: <Suspense fallback={<></>}><Account /></Suspense>,
      },
      {
        path: "payouts",
        element: <Suspense fallback={<></>}><Payouts /></Suspense>,
      },
    ],
  },
];