interface Props {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export default function AuthProgress({
  currentStep,
  totalSteps,
  labels,
}: Props) {
  return (
    <div className="flex flex-col gap-3 mb-8">
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < currentStep
                  ? "var(--color-ink)"
                  : "var(--color-stone-surface)",
            }}
          />
        ))}
      </div>
      <p
        className="text-xs font-medium"
        style={{ color: "var(--color-light-steel)" }}
      >
        Step {currentStep} of {totalSteps} — {labels[currentStep - 1]}
      </p>
    </div>
  );
}