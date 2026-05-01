import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectOnboardingEmail } from "@/redux/slices/authSlice";
import AuthLayout from "../shared/AuthLayout";
import AuthProgress from "../shared/AuthProgress";
import StepEmail from "./steps/StepEmail";
import StepEmailSent from "./steps/StepEmailSent";
import StepPassword from "./steps/StepPassword";
import StepDetails from "./steps/StepDetails";
import StepCreateStore from "./steps/StepCreateStore";
import { useOnboarding } from "./hooks/useOnboarding";
import { useVerifyEmailMutation } from "@/redux/services/authApi";

const STEP_LABELS = [
  "Email",
  "Verify email",
  "Password",
  "Your details",
  "Create store",
];

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const savedEmail = useSelector(selectOnboardingEmail);

  const urlStep = Number(searchParams.get("step"));
  const urlEmail = searchParams.get("email") ?? "";

  const [step, setStep] = useState<number>(
    urlStep >= 1 && urlStep <= TOTAL_STEPS ? urlStep : 1
  );

  const email = urlEmail || savedEmail || "";

  const onNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const onBack = () => setStep((s) => Math.max(s - 1, 1));

  const {
    handleEmail,
    handlePassword,
    handleDetails,
    handleCreateStore,
    sendingEmail,
    settingPassword,
    registering,
    creatingStore,
  } = useOnboarding(email, onNext);

  const [resendEmail, { isLoading: resending }] = useVerifyEmailMutation();

  const handleResend = async () => {
    if (!email) return;
    await resendEmail({ email }).unwrap();
  };

  const leftContent = (
    <div className="flex flex-col gap-6">
      <h2
        className="text-[44px] font-semibold leading-[1.1]"
        style={{ color: "var(--color-canvas)", letterSpacing: "-0.66px" }}
      >
        {step === 1 && "Join 10,000+ sellers."}
        {step === 2 && "Almost there."}
        {step === 3 && "Keep it secure."}
        {step === 4 && "Tell us who you are."}
        {step === 5 && "Your store awaits."}
      </h2>
      <p
        className="text-[15px] leading-relaxed max-w-xs"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {step === 1 && "No credit card required. Start free, scale when you're ready."}
        {step === 2 && "Check your inbox and click the verification link to continue."}
        {step === 3 && "A strong password keeps your store and earnings safe."}
        {step === 4 && "We'll personalise your dashboard based on how you use Selleasi."}
        {step === 5 && "You're one step away from your first sale."}
      </p>

      <div className="flex flex-col gap-3 mt-4">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i < step
                    ? "var(--color-warm-mist)"
                    : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
        <p
          className="text-xs"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );

  return (
    <AuthLayout leftContent={leftContent}>
      <AuthProgress
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        labels={STEP_LABELS}
      />

      {step === 1 && (
        <StepEmail
          onSubmit={handleEmail}
          isLoading={sendingEmail}
          defaultEmail={email}
        />
      )}

      {step === 2 && (
        <StepEmailSent
          email={email}
          onResend={handleResend}
          isResending={resending}
        />
      )}

      {step === 3 && (
        <StepPassword
          onSubmit={handlePassword}
          isLoading={settingPassword}
        />
      )}

      {step === 4 && (
        <StepDetails
          onSubmit={handleDetails}
          isLoading={registering}
        />
      )}

      {step === 5 && (
        <StepCreateStore
          onSubmit={handleCreateStore}
          isLoading={creatingStore}
        />
      )}

      {step > 1 && step !== 2 && (
        <button
          onClick={onBack}
          className="mt-6 text-sm transition-opacity hover:opacity-60 flex items-center gap-1"
          style={{ color: "var(--color-muted-stone)" }}
        >
          ← Back
        </button>
      )}
    </AuthLayout>
  );
}