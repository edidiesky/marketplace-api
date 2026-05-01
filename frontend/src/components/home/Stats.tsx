import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const stats = [
  {
    value: "10,000+",
    label: "At Onitsha Main Market, West Africa’s largest market, Moniepoint supports generational businesses and enables safer, faster trade.",
    description: "Entrepreneurs across Nigeria trust Selleasi to power their stores.",
    bg: "#1a56ff",
    tagBg: "var(--color-warm-mist)",
    image:"https://2025.moniepoint.com/_next/static/media/POS.d298f7b6.svg",
    color: "#ffffff",
  },
  {
    value: "50,000+",
    label: "Products listed",
    description: "From fashion to electronics, every category is represented.",
    bg: "#111111",
    tagBg: "var(--color-warm-mist)",
    image:"https://2025.moniepoint.com/_next/static/media/POS.d298f7b6.svg",
    color: "#ffffff",
  },
  {
    value: "₦2B+",
    label: "Revenue processed",
    description: "Real money moving through real stores in real time.",
    bg: "#00a86b",
    tagBg: "var(--color-warm-mist)",
    image:"https://2025.moniepoint.com/_next/static/media/Fruit.527795c5.svg",
    color: "#ffffff",
  },
  {
    value: "99.9%",
    label: "Uptime guaranteed",
    description: "Your store never sleeps. Neither does our infrastructure.",
    bg: "#f8e600",
    tagBg: "var(--color-warm-mist)",
    image:"https://2025.moniepoint.com/_next/static/media/POS.d298f7b6.svg",
    color: "#111111",
  },
];

const rotations = [-22, -8, 8, 22];

export default function StatsScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-52%"]);

  return (
    <section
      ref={containerRef}
      className="relative h-[750vh]"
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center gap-12">
        <motion.div
          style={{ x }}
          className="flex gap-6 pl-[80px] lg:pl-[720px] will-change-transform"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              style={{
                backgroundColor: stat.bg,
                rotate: rotations[i],
                transformOrigin: "center bottom",
              }}
              // whileHover={{ rotate: 0, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              className="flex-shrink-0 w-[300px] lg:w-[440px] min-h-[580px] rounded-[24px] p-8 flex flex-col gap-6 relative overflow-hidden"
            >
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10"
                style={{ backgroundColor: stat.color }}
              />
              <p
                className="text-5xl lg:text-6xl font-bold leading-none"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p
                className="text-xl font-semibold leading-snug"
                style={{ color: stat.color }}
              >
                {stat.label}
              </p>
              <p
                className="text-sm leading-relaxed mt-auto"
                style={{ color: `${stat.color}99` }}
              >
                {stat.description}
              </p>
              <div className="w-full">
                <img
                  src={stat.image}
                  // alt={stat.tag}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}