import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  setCredentials,
  clearOtpPending,
  selectOnboardingEmail,
} from "@/redux/slices/authSlice";
import { useVerifyOtpMutation, useLoginMutation } from "@/redux/services/authApi";
import AuthLayout from "./shared/AuthLayout";
import toast from "react-hot-toast";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtp() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const email = useSelector(selectOnboardingEmail) ?? "";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: resending }] = useLoginMutation();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== "") && newOtp.join("").length === OTP_LENGTH) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, OTP_LENGTH);
    if (!/^\d+$/.test(pasted)) return;
    const newOtp = pasted.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) handleVerify(pasted);
  };

  const handleVerify = async (code: string) => {
    if (!email) { toast.error("Session expired. Please log in again."); return; }
    try {
      const result = await verifyOtp({ email, otp: code }).unwrap();
      dispatch(setCredentials({ user: result.data.user, accessToken: result.data.accessToken }));
      dispatch(clearOtpPending());
      const user = result.data.user;
      if (user.userType === "ADMIN") { navigate("/admin"); return; }
      if (user.userType === "SELLER") {
        navigate(from !== "/" ? from : `/dashboard/store/${user.tenantId ?? ""}`);
        return;
      }
      navigate(from !== "/" ? from : "/");
    } catch {
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await resendOtp({ email, password: "" }).unwrap();
      setCountdown(RESEND_SECONDS);
      toast.success("New OTP sent to your email.");
    } catch {
      // handled globally
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1
            className="text-[32px] font-semibold leading-[1.1]"
            style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
          >
            Enter your code
          </h1>
          <p
            className="text-[15px]"
            style={{ color: "var(--color-muted-stone)" }}
          >
            We sent a 6-digit code to{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--color-ink)" }}
            >
              {email}
            </span>
          </p>
        </div>

        <div className="flex gap-2" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <motion.input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="flex-1 h-14 text-center text-xl font-bold rounded-[12px] border-2 transition-all outline-none focus:ring-0"
              style={{
                borderColor: digit
                  ? "var(--color-ink)"
                  : "var(--color-stone-surface)",
                backgroundColor: digit
                  ? "var(--color-fog)"
                  : "var(--color-canvas)",
                color: "var(--color-ink)",
              }}
              whileFocus={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          ))}
        </div>

        {verifying && (
          <p
            className="text-sm text-center"
            style={{ color: "var(--color-muted-stone)" }}
          >
            Verifying...
          </p>
        )}

        <button
          onClick={() => handleResend()}
          disabled={countdown > 0 || resending}
          className="text-sm text-center transition-opacity disabled:opacity-40"
          style={{ color: "var(--color-muted-stone)" }}
        >
          {countdown > 0
            ? `Resend code in ${countdown}s`
            : resending
            ? "Sending..."
            : "Resend code"}
        </button>

        <p
          className="text-sm text-center"
          style={{ color: "var(--color-muted-stone)" }}
        >
          Wrong email?{" "}
          <button
            onClick={() => navigate("/login")}
            className="font-medium underline underline-offset-4"
            style={{ color: "var(--color-ink)" }}
          >
            Go back
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}