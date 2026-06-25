import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RefreshCw, Clock, MailX } from "lucide-react";
import { useConfirmEmailMutation, useResendVerificationMutation } from "@/redux/services/authApi";
import {
  setOnboardingShowVerify,
  setOnboardingPendingEmail,
  setOnboardingStep,
} from "@/redux/slices/authSlice";
import { useDispatch } from "react-redux";
type Status = "loading" | "success" | "error" | "idle";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const dispatch       = useDispatch();
  const [status, setStatus]         = useState<Status>("idle");
  const [isResending, setResending] = useState(false);
  const [confirmEmail]  = useConfirmEmailMutation();
  const [resendEmail]   = useResendVerificationMutation();

  const token = searchParams.get("token");
  const email = searchParams.get("email") ?? "";

  useEffect(() => {
    if (status !== "idle") return;
    if (!token || !email) { setStatus("error"); return; }

    setStatus("loading");

    confirmEmail({ token, email })
      .unwrap()
      .then(() => {
        // write verified state into Redux before navigating
        dispatch(setOnboardingPendingEmail(email));
        dispatch(setOnboardingShowVerify(false));
        dispatch(setOnboardingStep(2));
        setStatus("success");
        navigate("/onboarding");
      })
      .catch(() => setStatus("error"));
  }, [token, email]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try { await resendEmail({ email }).unwrap(); }
    finally { setResending(false); }
  };

  if (status === "loading")
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--color-fog)" }}
      >
        <div className="max-w-md w-full bg-white p-10 flex flex-col gap-6">
          <div
            className="w-14 h-14 flex items-center justify-center"
            style={{ backgroundColor: "var(--color-warm-mist)" }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: "var(--color-stone-surface)",
                borderTopColor: "var(--color-ink)",
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1
              className="text-[28px] font-semibold leading-[1.1]"
              style={{ color: "var(--color-ink)", letterSpacing: "-0.5px" }}
            >
              Verifying your email
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-muted-stone)" }}
            >
              Confirming your link with the server. This only takes a second.
            </p>
          </div>
          <div
            className="p-4 border flex gap-3 items-center"
            style={{
              borderColor: "var(--color-stone-surface)",
              backgroundColor: "var(--color-fog)",
            }}
          >
            <Clock size={14} style={{ color: "var(--color-muted-stone)" }} />
            <p
              className="text-sm"
              style={{ color: "var(--color-muted-stone)" }}
            >
              Do not close this tab while verification is in progress.
            </p>
          </div>
          <p
            className="text-xs text-center"
            style={{ color: "var(--color-muted-stone)" }}
          >
            Token expires 15 minutes after the email was sent.
          </p>
        </div>
      </div>
    );

  if (status === "error")
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--color-fog)" }}
      >
        <div className="max-w-md w-full bg-white p-10 flex flex-col gap-6">
          <div
            className="w-14 h-14 flex items-center justify-center"
            style={{ backgroundColor: "#fdf0ed" }}
          >
            <MailX size={24} style={{ color: "var(--color-terracotta)" }} />
          </div>
          <div className="flex flex-col gap-2">
            <h1
              className="text-[28px] font-semibold leading-[1.1]"
              style={{ color: "var(--color-ink)", letterSpacing: "-0.5px" }}
            >
              Verification failed
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-muted-stone)" }}
            >
              The link may have expired or already been used. Links are valid
              for 15 minutes.
            </p>
          </div>
          <div
            className="p-4 flex flex-col gap-3 border"
            style={{
              borderColor: "var(--color-stone-surface)",
              backgroundColor: "var(--color-fog)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-muted-stone)" }}
            >
              Possible reasons
            </p>
            {[
              "The link is older than 15 minutes",
              "The link has already been clicked once",
              "The email or token in the URL was modified",
            ].map((s) => (
              <div key={s} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{
                    backgroundColor: "var(--color-terracotta)",
                    color: "var(--color-canvas)",
                  }}
                >
                  !
                </span>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-muted-stone)" }}
                >
                  {s}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/onboarding")}
            className="w-full h-12 flex items-center justify-center text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--color-ink)",
              color: "var(--color-canvas)",
            }}
          >
            Start registration again →
          </button>
          <button
            onClick={handleResend}
            disabled={isResending}
            className="flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-60 disabled:opacity-40"
            style={{ color: "var(--color-muted-stone)" }}
          >
            <RefreshCw
              size={13}
              className={isResending ? "animate-spin" : ""}
            />
            {isResending ? "Resending..." : "Resend verification email"}
          </button>
        </div>
      </div>
    );

  return null; // success redirects immediately
}
