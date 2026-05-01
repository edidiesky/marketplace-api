
import { motion,} from "framer-motion";
import { ShoppingBag, BarChart3, Truck, Zap } from "lucide-react";

const features = [
  {
    tag: "STORE MANAGEMENT",
    title: "Build and manage your store without writing a line of code.",
    bullets: [
      "Create unlimited products with variants, images, and pricing",
      "Manage inventory in real time with low-stock alerts",
      "Customize your storefront with your brand colors and logo",
    ],
    icon: ShoppingBag,
    bg: "#f0fdf4",
    accent: "#004E3F",
    cardLabel: "Store dashboard",
    cardSub: "14 products · 3 low stock",
  },
  {
    tag: "ANALYTICS",
    title: "Know exactly what is selling and what is not.",
    bullets: [
      "Revenue charts broken down by day, week, and month",
      "Top performing products at a glance",
      "Customer acquisition and retention tracking",
    ],
    icon: BarChart3,
    bg: "#fefce8",
    accent: "#854d0e",
    cardLabel: "Revenue this month",
    cardSub: "₦1,240,000 · +18% vs last month",
  },
  {
    tag: "ORDER FULFILLMENT",
    title: "From payment confirmed to package delivered.",
    bullets: [
      "Automatic order creation on successful payment",
      "Update fulfillment status with tracking number",
      "Buyers receive real-time delivery notifications",
    ],
    icon: Truck,
    bg: "#eff6ff",
    accent: "#1d4ed8",
    cardLabel: "Order #ORD-00482",
    cardSub: "Dispatched · Arriving Saturday",
  },
  {
    tag: "PAYMENTS",
    title: "Accept payments via Paystack and Flutterwave instantly.",
    bullets: [
      "Dual gateway support with automatic failover",
      "Payouts to your bank account on demand",
      "Full refund management from the dashboard",
    ],
    icon: Zap,
    bg: "#fdf4ff",
    accent: "#7e22ce",
    cardLabel: "Payout processed",
    cardSub: "₦340,000 · GTBank · 2 mins ago",
  },
];

export default function StickyFeatures() {
  return (
    <section className="bg-white">
      <div className="px-4 lg:px-16 py-24 text-center max-w-7xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-[#888]">
          Everything you need
        </span>
        <h2 className="text-3xl lg:text-5xl font-bold mt-2 max-w-2xl mx-auto leading-tight text-[#171717]">
          One platform. Every tool your store needs.
        </h2>
      </div>

      {features.map((feature, i) => {
        const Icon = feature.icon;
        return (
          <div
            key={i}
            className="sticky top-[68px] min-h-screen flex items-center px-4 lg:px-16 py-20 bg-white"
            style={{ zIndex: i + 1 }}
          >
            <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
              <div className="flex flex-col gap-6">
                <span
                  className="text-xs font-semibold tracking-widest px-3 py-1 rounded-full w-fit"
                  style={{
                    backgroundColor: feature.bg,
                    color: feature.accent,
                  }}
                >
                  {feature.tag}
                </span>
                <h3 className="text-2xl lg:text-4xl font-bold leading-tight text-[#171717]">
                  {feature.title}
                </h3>
                <ul className="flex flex-col gap-3">
                  {feature.bullets.map((bullet, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-3 text-sm text-[#666]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                        style={{ backgroundColor: feature.accent }}
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: true, margin: "-100px" }}
                className="rounded-2xl p-10 min-h-[360px] flex flex-col justify-between relative overflow-hidden"
                style={{ backgroundColor: feature.bg }}
              >
                <div
                  className="absolute top-6 right-6 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: feature.accent }}
                >
                  <Icon className="text-white w-5 h-5" />
                </div>
                <div
                  className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-10"
                  style={{ backgroundColor: feature.accent }}
                />
                <div className="mt-auto">
                  <p
                    className="text-lg font-semibold"
                    style={{ color: feature.accent }}
                  >
                    {feature.cardLabel}
                  </p>
                  <p className="text-sm text-[#888] mt-1">{feature.cardSub}</p>
                </div>
              </motion.div>
            </div>
          </div>
        );
      })}
    </section>
  );
}