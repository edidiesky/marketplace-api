import React, { Suspense, lazy } from "react";
import { ProtectRoute } from "./guards/ProtectRoute";
const AdminLayout = lazy(() => import("@/screens/admin/layout"));
const AdminHome = lazy(() => import("@/screens/admin/home"));
const AdminUsers = lazy(() => import("@/screens/admin/users"));
const AdminStores = lazy(() => import("@/screens/admin/stores"));

export const adminRoutes = [
  {
    path: "/admin",
    element: (
      <ProtectRoute allowedRoles={["ADMIN"]}>
        <Suspense fallback={<></>}>
          <AdminLayout />
        </Suspense>
      </ProtectRoute>
    ),
    children: [
      {
        index: true,
        element: <Suspense fallback={<></>}><AdminHome /></Suspense>,
      },
      {
        path: "users",
        element: <Suspense fallback={<></>}><AdminUsers /></Suspense>,
      },
      {
        path: "stores",
        element: <Suspense fallback={<></>}><AdminStores /></Suspense>,
      },
    ],
  },
];