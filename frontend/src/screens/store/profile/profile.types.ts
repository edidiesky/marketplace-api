import type { OrderStatus, FulfillmentStatus } from "@/types/api";

export type ProfileTab =
  | "account"
  | "orders"
  | "security"
  | "address"
  | "notifications";

export interface TabDef {
  key: ProfileTab;
  label: string;
}

export const PROFILE_TABS: TabDef[] = [
  { key: "account",       label: "Account"       },
  { key: "orders",        label: "My Orders"     },
  { key: "security",      label: "Security"      },
  { key: "address",       label: "Addresses"     },
  { key: "notifications", label: "Notifications" },
];

export const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  payment_pending:   { label: "Pending",      className: "bg-yellow-50 text-yellow-800" },
  payment_initiated: { label: "Initiated",    className: "bg-blue-50 text-blue-700"     },
  completed:         { label: "Completed",    className: "bg-green-50 text-green-700"   },
  failed:            { label: "Failed",       className: "bg-red-50 text-red-700"       },
  out_of_stock:      { label: "Out of Stock", className: "bg-orange-50 text-orange-700" },
};

export const fulfillmentConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  unfulfilled:      { label: "Unfulfilled",      className: "bg-[#f2f0ed] text-[#4c4c4c]" },
  preparing:        { label: "Preparing",        className: "bg-blue-50 text-blue-700"    },
  dispatched:       { label: "Dispatched",       className: "bg-sky-50 text-sky-700"      },
  in_transit:       { label: "In Transit",       className: "bg-cyan-50 text-cyan-700"    },
  out_for_delivery: { label: "Out for Delivery", className: "bg-indigo-50 text-indigo-700"},
  delivered:        { label: "Delivered",        className: "bg-green-50 text-green-700"  },
  delivery_failed:  { label: "Delivery Failed",  className: "bg-red-50 text-red-700"      },
  returned:         { label: "Returned",         className: "bg-orange-50 text-orange-700"},
};