import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth", "User", "Store", "Product", "Cart",
    "Order", "Inventory", "Payment", "Payout",
    "Wallet", "Notification", "Review", "Category",
    "Color", "Size",
  ],
  endpoints: () => ({}),
});