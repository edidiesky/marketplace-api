import React, { Suspense, lazy } from "react";
import AdminLayout from "@/screens/admin/layout";
import { ProtectRoute } from "./guards/ProtectRoute";

const AdminHome    = lazy(() => import("@/screens/admin/home"));
const AdminStores  = lazy(() => import("@/screens/admin/stores"));
const AdminUsers   = lazy(() => import("@/screens/admin/users"));
const AdminPayouts = lazy(() => import("@/screens/admin/payouts"));

// reused seller dashboard 
const Analytics  = lazy(() => import("@/screens/dashboard/analytics"));
const Orders     = lazy(() => import("@/screens/dashboard/orders"));
const Payments   = lazy(() => import("@/screens/dashboard/payments"));
const Products   = lazy(() => import("@/screens/dashboard/products"));
const Categories = lazy(() => import("@/screens/dashboard/categories"));
const Colors     = lazy(() => import("@/screens/dashboard/colors"));
const Sizes      = lazy(() => import("@/screens/dashboard/size"));
const Account    = lazy(() => import("@/screens/dashboard/account"));

const Fallback = () => <></>;

export const adminRoutes = [
  {
    path: "/admin",
    element: (
      // <ProtectRoute allowedRoles={["ADMIN"]}>
      //   <AdminLayout />
      // </ProtectRoute>
      <AdminLayout />
    ),
    children: [
      { index: true,           element: <Suspense fallback={<Fallback />}><AdminHome /></Suspense>    },
      { path: "stores",        element: <Suspense fallback={<Fallback />}><AdminStores /></Suspense>  },
      { path: "users",         element: <Suspense fallback={<Fallback />}><AdminUsers /></Suspense>   },
      { path: "payouts",       element: <Suspense fallback={<Fallback />}><AdminPayouts /></Suspense> },
      { path: "analytics",     element: <Suspense fallback={<Fallback />}><Analytics /></Suspense>   },
      { path: "orders",        element: <Suspense fallback={<Fallback />}><Orders /></Suspense>       },
      { path: "payments",      element: <Suspense fallback={<Fallback />}><Payments /></Suspense>     },
      { path: "products",      element: <Suspense fallback={<Fallback />}><Products /></Suspense>     },
      { path: "categories",    element: <Suspense fallback={<Fallback />}><Categories /></Suspense>   },
      { path: "colors",        element: <Suspense fallback={<Fallback />}><Colors /></Suspense>       },
      { path: "sizes",         element: <Suspense fallback={<Fallback />}><Sizes /></Suspense>        },
      { path: "account",       element: <Suspense fallback={<Fallback />}><Account /></Suspense>      },
    ],
  },
];