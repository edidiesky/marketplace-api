import { lazy } from "react";

const DashboardHome = lazy(() => import("./home/index"));
const Customers = lazy(() => import("./customers/index"));
const Analytics = lazy(() => import("./analytics/index"));
const Messages = lazy(() => import("./messages/index"));
const Orders = lazy(() => import("./orders/index"));
const Stores = lazy(() => import("./stores/index"));
const Marketing = lazy(() => import("./marketing/index"));
const Product = lazy(() => import("./products/index"));
const Account = lazy(() => import("./account/index"));
const Color = lazy(() => import("./colors/index"));
const Categories = lazy(() => import("./categories/index"));
const Size = lazy(() => import("./size/index"));

export {
  DashboardHome,
  Product,
  Customers,
  Analytics,
  Messages,
  Orders,
  Stores,
  Marketing,
  Account,
  Color,
  Categories,
  Size
};
