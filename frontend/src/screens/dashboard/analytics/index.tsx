import { useState } from "react";
import InventoryTab from "./components/tabs/inventory";
import PaymentsTab from "./components/tabs/payments";
import CustomersTab from "./components/tabs/customers";
import ProductsTab from "./components/tabs/products";
import RevenueTab from "./components/tabs/revenue";
import OrdersTab from "./components/tabs/orders";

type Tab =
  | "orders"
  | "revenue"
  | "products"
  | "customers"
  | "payments"
  | "inventory";

const TABS: { key: Tab; label: string }[] = [
  { key: "orders", label: "Orders" },
  { key: "revenue", label: "Revenue" },
  { key: "products", label: "Products" },
  { key: "customers", label: "Customers" },
  { key: "payments", label: "Payments" },
  { key: "inventory", label: "Inventory" },
];

const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  orders: <OrdersTab />,
  revenue: <RevenueTab />,
  products: <ProductsTab />,
  customers: <CustomersTab />,
  payments: <PaymentsTab />,
  inventory: <InventoryTab />,
};

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<Tab>("orders");

  return (
    <div className="w-full p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">
        <div>
          <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">
            Analytics
          </h4>
          <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[520px]">
            Track performance across orders, revenue, products, customers,
            payments, and inventory. Use these insights to drive business and
            marketing decisions.
          </p>
        </div>

        <div className="flex items-center border-b border-[#e8e6e3] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-semibold font-dashboard_regular transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#17191c] text-[#17191c]"
                  : "border-transparent text-[#777b86] hover:text-[#17191c]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>{TAB_CONTENT[activeTab]}</div>
      </div>
    </div>
  );
}
