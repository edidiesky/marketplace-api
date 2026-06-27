import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface StepItem {
  label: string;
  status: "done" | "active" | "pending";
}

interface Props {
  children: React.ReactNode;
  leftContent?: React.ReactNode;
  steps?: StepItem[];
  currentStep?: number;
  stepLabels?: string[];
}

function DefaultLeftPanel() {
  return (
    <div className="flex flex-col gap-4">
      <h2
        className="text-[28px]  leading-[1.1] text-[#17191c]"
        style={{ letterSpacing: "-0.5px" }}
      >
        Start selling in minutes.
      </h2>
      <p className="text-[15px] leading-relaxed text-[#6b7280]">
        No code. No complexity. Just your store, live and accepting orders today.
      </p>
    </div>
  );
}

function StepChecklist({ steps }: { steps: StepItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2.5 px-3 rounded-[10px] transition-colors"
          style={{ backgroundColor: step.status === "active" ? "#f5f5f3" : "transparent" }}
        >
          {step.status === "done" ? (
            <CheckCircle2 size={18} className="shrink-0" style={{ color: "#17191c" }} />
          ) : step.status === "active" ? (
            <Loader2 size={18} className="shrink-0 animate-spin" style={{ color: "#17191c" }} />
          ) : (
            <Circle size={18} className="shrink-0" style={{ color: "#d1d5db" }} />
          )}
          <span
            className="text-sm"
            style={{
              color: step.status === "pending" ? "#9ca3af" : "#17191c",
              fontWeight: step.status === "active" ? 600 : 400,
              textDecoration: step.status === "done" ? "line-through" : "none",
            }}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AuthLayout({
  children,
  leftContent,
  steps,
  currentStep,
  stepLabels,
}: Props) {
  const resolvedSteps: StepItem[] | null =
    stepLabels && currentStep != null
      ? stepLabels.map((label, i) => ({
          label,
          status:
            i + 1 < currentStep
              ? "done"
              : i + 1 === currentStep
              ? "active"
              : "pending",
        }))
      : steps ?? null;

  const remainingCount = resolvedSteps
    ? resolvedSteps.filter((s) => s.status !== "done").length
    : null;

  return (
    <div
      className="min-h-screen grid lg:grid-cols-[400px_1fr]"
      style={{ backgroundColor: "var(--color-canvas)" }}
    >
      {/* left panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-10"
        style={{ backgroundColor: "#ffffff", borderColor: "#f0f0ee" }}
      >
        <Link to="/" className="text-[15px] " style={{ color: "#17191c" }}>
          Selleasi
        </Link>

        <div className="flex flex-col gap-6">
          {resolvedSteps ? (
            <>
              <div className="flex flex-col gap-1">
                <h2
                  className="text-[22px] "
                  style={{ color: "#17191c", letterSpacing: "-0.3px" }}
                >
                  Create Account
                </h2>
                {remainingCount != null && remainingCount > 0 && (
                  <p className="text-sm" style={{ color: "#6b7280" }}>
                    {remainingCount} step{remainingCount > 1 ? "s" : ""} remaining
                  </p>
                )}
              </div>
              <StepChecklist steps={resolvedSteps} />
            </>
          ) : (
            leftContent ?? <DefaultLeftPanel />
          )}
        </div>

        <p className="text-xs" style={{ color: "#9ca3af" }}>
          © {new Date().getFullYear()} Edidiong
        </p>
      </div>

      {/* right panel */}
      <div
        className="flex items-center justify-center p-6 lg:p-12"
        style={{ backgroundColor: "var(--color-canvas)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="text-base  mb-8 block lg:hidden"
            style={{ color: "#17191c" }}
          >
            Selleasi
          </Link>
          {children}
        </motion.div>
      </div>
    </div>
  );
}