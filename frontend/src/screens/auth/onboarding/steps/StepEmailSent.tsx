import { Mail, ExternalLink } from "lucide-react";

interface Props {
  email: string;
  onResend: () => void;
  isResending: boolean;
}

export default function StepEmailSent({ email, onResend, isResending }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          className="text-[32px] font-semibold leading-[1.1]"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
        >
          Check your inbox
        </h1>
        <p
          className="text-[15px]"
          style={{ color: "var(--color-muted-stone)" }}
        >
          We sent a verification link to{" "}
          <span
            className="font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            {email}
          </span>
        </p>
      </div>

      <div
        className="rounded-[16px] p-6 flex items-start gap-4"
        style={{ backgroundColor: "var(--color-fog)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--color-warm-mist)" }}
        >
          <Mail size={18} style={{ color: "var(--color-terracotta)" }} />
        </div>
        <div className="flex flex-col gap-1">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            Verification link sent
          </p>
          <p
            className="text-sm"
            style={{ color: "var(--color-muted-stone)" }}
          >
            Click the link in the email to confirm your address. The link
            expires in 15 minutes.
          </p>
        </div>
      </div>

      <a
        href="https://mail.google.com"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium border transition-opacity hover:opacity-70"
        style={{
          color: "var(--color-ink)",
          borderColor: "var(--color-ink)",
          borderRadius: "9999px",
        }}
      >
        Open Gmail
        <ExternalLink size={14} />
      </a>

      <button
        onClick={onResend}
        disabled={isResending}
        className="text-sm text-center transition-opacity hover:opacity-60 disabled:opacity-40"
        style={{ color: "var(--color-muted-stone)" }}
      >
        {isResending ? "Resending..." : "Didn't receive it? Resend"}
      </button>
    </div>
  );
}