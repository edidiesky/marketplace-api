import { Building2, CalendarCheck, CreditCard } from "lucide-react";
import { IoAnalytics } from "react-icons/io5";

const ACTIONS = [
  { id: "add-products",  title: "Add products",  subtitle: "Register a new products",     Icon: Building2,     href: "/dashboard/products" },
  { id: "view-orders", title: "View orders", subtitle: "See all orders",         Icon: CalendarCheck, href: "/dashboard/orders" },
  { id: "view-payments", title: "View payments", subtitle: "Track transactions",           Icon: CreditCard,    href: "/dashboard/payments" },
  { id: "view-analytics", title: "View analytics", subtitle: "Track transactions",           Icon: IoAnalytics,    href: "/dashboard/analytics" },
];

export default function QuickActionsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {ACTIONS.map(({ id, title, subtitle, Icon, href }) => (
        <a
          key={id}
          href={href}
          className="flex items-center hover:bg-[#f2f0ed5f] h-24 lg:h-32 gap-3 rounded-2xl border border-[var(--color-fog)] bg-[var(--color-canvas)] px-4 py-3.5 hover:border-[var(--color-ink)]/20 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--color-fog)]">
            <Icon size={14} style={{ color: "var(--color-ink)" }} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <p className="text-base bold" style={{ color: "var(--color-ink)" }}>{title}</p>
            <p className="text-sm lg:text-sm medium truncate" style={{ color: "var(--color-muted-stone)" }}>{subtitle}</p>
          </div>
        </a>
      ))}
    </div>
  );
}