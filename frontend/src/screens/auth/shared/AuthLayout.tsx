import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  leftContent?: React.ReactNode;
}

export default function AuthLayout({ children, leftContent }: Props) {
  return (
    <div
      className="min-h-screen grid lg:grid-cols-[480px_1fr]"
      style={{ backgroundColor: "var(--color-canvas)" }}
    >
      {/* left panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "var(--color-ink)" }}
      >
        <Link
          to="/"
          className="text-xl font-semibold"
          style={{ color: "var(--color-canvas)" }}
        >
          Selleasi
        </Link>

        <div className="z-10">
          {leftContent ?? (
            <div className="flex flex-col gap-4">
              <h2
                className="text-[44px] lg:text-5xl font-semibold leading-[1.1]"
                style={{
                  color: "var(--color-canvas)",
                  letterSpacing: "-0.66px",
                }}
              >
                Start selling in minutes.
              </h2>
              <p
                className="text-[15px] lg:text-xl leading-relaxed max-w-xs"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                No code. No complexity. Just your store, live and accepting
                orders today.
              </p>
            </div>
          )}
        </div>

        <p
          className="text-xs z-10"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          © {new Date().getFullYear()} Selleasi
        </p>

        {/* decorative blob */}
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: "var(--color-warm-mist)" }}
        />
      </div>

      {/* right panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* mobile logo */}
          <Link
            to="/"
            className="text-base font-semibold mb-8 block lg:hidden"
            style={{ color: "var(--color-ink)" }}
          >
            Selleasi
          </Link>
          {children}
        </motion.div>
      </div>
    </div>
  );
}