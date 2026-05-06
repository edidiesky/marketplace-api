import { createBrowserRouter } from "react-router-dom";
import { guestRoutes } from "./guestRoutes";
import { authRoutes } from "./authRoutes";
import { storeRoutes } from "./storeRoutes";
import { dashboardRoutes } from "./dashboardRoutes";
import { adminRoutes } from "./adminRoutes";

export const router = createBrowserRouter([
  ...guestRoutes,
  ...authRoutes,
  ...storeRoutes,
  ...dashboardRoutes,
  ...adminRoutes,
]);