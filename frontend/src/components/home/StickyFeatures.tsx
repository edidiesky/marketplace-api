import { motion } from "framer-motion";
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
    accentColor: "var(--color-terracotta)",
    tagBg: "var(--color-warm-mist)",
    image: "/images/hero/feature1.jpg",
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
    accentColor: "var(--color-ink)",
    tagBg: "var(--color-fog)",
    image: "/images/hero/feature2.jpg",
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
    accentColor: "var(--color-terracotta)",
    tagBg: "var(--color-warm-mist)",
    image: "/images/hero/feature3.jpg",
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
    accentColor: "var(--color-ink)",
    tagBg: "var(--color-fog)",
    image: "/images/hero/feature4.jpg",
  },
];

export default function StickyFeatures() {
  return (
    <section style={{ backgroundColor: "var(--color-canvas)" }}>
      <div
        className="mx-auto px-6 lg:px-8 pt-32 pb-20 text-center"
        style={{ maxWidth: "1280px" }}
      >
        <span
          className="text-xl lg:text-2xl font-medium uppercase tracking-widest"
          style={{ color: "var(--color-light-steel)" }}
        >
          Everything you need
        </span>
        <h2
          className="text-5xl lg:text-7xl font-semibold mt-2 max-w-2xl mx-auto leading-[1.1]"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
        >
          One platform. Every tool your store needs.
        </h2>
      </div>

      {features.map((feature, i) => {
        return (
          <div
            key={i}
            className="sticky flex items-center px-6 lg:px-8 py-16 min-h-[70vh]"
            style={{
              top: "64px",
              zIndex: i + 1,
              backgroundColor: "var(--color-canvas)",
            }}
          >
            <div
              className="mx-auto w-full grid lg:grid-cols-2 gap-16 items-center"
              style={{ maxWidth: "1280px" }}
            >
              {/* left: text */}
              <div className="flex flex-col gap-6">
                <span
                  className="text-xs font-semibold tracking-widest px-3 py-1.5 rounded-full w-fit border"
                  style={{
                    color: feature.accentColor,
                    borderColor: feature.accentColor,
                    backgroundColor: feature.tagBg,
                  }}
                >
                  {feature.tag}
                </span>

                <h3
                  className="text-3xl lg:text-5xl font-semibold leading-[1.1]"
                  style={{
                    color: "var(--color-ink)",
                    letterSpacing: "-0.66px",
                  }}
                >
                  {feature.title}
                </h3>

                <ul className="flex flex-col gap-3">
                  {feature.bullets.map((bullet, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-3 text-lg leading-relaxed"
                      style={{
                        color: "var(--color-muted-stone)",
                        letterSpacing: "-0.009em",
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                        style={{ backgroundColor: feature.accentColor }}
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              {/* right: image */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: true, margin: "-80px" }}
                className="w-full h-[520px] rounded-[24px] overflow-hidden"
                style={{ boxShadow: "var(--shadow-steep)" }}
              >
                <img
                  src={feature.image}
                  alt={feature.tag}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>
          </div>
        );
      })}
    </section>
  );
}