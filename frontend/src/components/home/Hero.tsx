
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetAllStoresQuery } from "@/redux/services/storeApi";
import { useRef } from "react";


export default function Hero() {
  const currentUser = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const stripRef = useRef<HTMLDivElement>(null);

  const { data: storesData } = useGetAllStoresQuery(
    {},
    { skip: !currentUser }
  );
  const firstStore = storesData?.data?.[0];

  const handleCta = () => {
    if (!currentUser) { navigate("/onboarding"); return; }
    navigate(firstStore ? `/dashboard/store/${firstStore._id}` : "/onboarding");
  };

  const { scrollYProgress } = useScroll({
    target: stripRef,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);

  return (
    <section
      className="w-full overflow-hidden"
      style={{ backgroundColor: "var(--color-canvas)" }}
    >
      {/* top: text + CTAs */}
      <div
        className="mx-auto px-6 lg:px-8 pt-20 pb-16"
        style={{ maxWidth: "1280px" }}
      >
        <div className="flex flex-col gap-8 items-center justify-center">

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-semibold text-center leading-[1.05]"
            style={{
              fontSize: "clamp(74px, 10vw, 80px)",
              color: "var(--color-ink)",
              letterSpacing: "-0.025em",
               fontFamily: "'Georgia', serif"
            }}
          >
            One platform.
            <br />
            Multiple stores.
            <br />
            <span style={{ color: "var(--color-terracotta)" }}>
              Real control.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base lg:text-xl text-center leading-relaxed max-w-md"
            style={{
              color: "var(--color-muted-stone)",
              letterSpacing: "-0.009em",
            }}
          >
            Selleasi gives every seller the infrastructure to launch, manage,
            and scale their online store without writing a single line of code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-3 flex-wrap"
          >
            <button
              onClick={handleCta}
              className="h-16 px-7 text-base font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--color-ink)",
                color: "var(--color-canvas)",
                borderRadius: "9999px",
              }}
            >
              {currentUser ? "Go to Dashboard" : "Start for free"}
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="h-16 px-7 text-base font-medium border transition-opacity hover:opacity-70"
              style={{
                color: "var(--color-ink)",
                borderColor: "var(--color-ink)",
                borderRadius: "9999px",
                backgroundColor: "transparent",
              }}
            >
              Log in
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-3 pt-2"
          >
            <div className="flex -space-x-4">
              {[
                "var(--color-terracotta)",
                "var(--color-ink)",
                "var(--color-muted-stone)",
                "var(--color-light-steel)",
              ].map((bg, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-base font-semibold text-white"
                  style={{
                    backgroundColor: bg,
                    borderColor: "var(--color-canvas)",
                  }}
                >
                  {["K", "A", "T", "E"][i]}
                </div>
              ))}
            </div>
            <p
              className="text-base"
              style={{ color: "var(--color-muted-stone)" }}
            >
              Joined by{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                10,000+
              </span>{" "}
              sellers across Nigeria
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}