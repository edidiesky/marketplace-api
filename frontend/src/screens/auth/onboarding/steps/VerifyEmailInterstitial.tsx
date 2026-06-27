import { Mail, ExternalLink, RefreshCw } from "lucide-react";

interface Props {
  email: string;
  onResend: () => void;
  isResending: boolean;
  onVerified: () => void;
}

export default function VerifyEmailInterstitial({ email, onResend, isResending, onVerified }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--color-fog)" }}>
      <div className="max-w-md w-full bg-white p-10 flex flex-col gap-6">

        <div
          className="w-14 h-14 flex items-center justify-center"
          style={{ backgroundColor: "var(--color-warm-mist)" }}
        >
          <Mail size={24} style={{ color: "var(--color-terracotta)" }} />
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="text-[28px]  leading-[1.1]"
            style={{ color: "var(--color-ink)", letterSpacing: "-0.5px" }}
          >
            Verify your email
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-stone)" }}>
            We sent a verification link to{" "}
            <span className="" style={{ color: "var(--color-ink)" }}>{email}</span>.
            Click the link to continue setting up your account.
          </p>
        </div>

        <div
          className="p-4 flex flex-col gap-3 border"
          style={{ borderColor: "var(--color-stone-surface)", backgroundColor: "var(--color-fog)" }}
        >
          <p className="text-xs  uppercase " style={{ color: "var(--color-muted-stone)" }}>
            What happens next
          </p>
          {[
            "Click the link in your email",
            "You'll be redirected back here automatically",
            "Complete your profile and launch your store",
          ].map((s, i) => (
            <div key={s} className="flex items-start gap-3">
              <span
                className="w-5 h-5 flex items-center justify-center text-xs  shrink-0 mt-0.5"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-canvas)" }}
              >
                {i + 1}
              </span>
              <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>{s}</p>
            </div>
          ))}
        </div>

        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium border transition-opacity hover:opacity-70"
          style={{ color: "var(--color-ink)", borderColor: "var(--color-ink)" }}
        >
          Open Gmail
          <ExternalLink size={14} />
        </a>

        <button
          onClick={onVerified}
          className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-canvas)" }}
        >
          I've verified my email →
        </button>

        <button
          onClick={onResend}
          disabled={isResending}
          className="flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-60 disabled:opacity-40"
          style={{ color: "var(--color-muted-stone)" }}
        >
          <RefreshCw size={13} className={isResending ? "animate-spin" : ""} />
          {isResending ? "Resending..." : "Didn't receive it? Resend"}
        </button>

        <p className="text-xs text-center" style={{ color: "var(--color-muted-stone)" }}>
          The link expires in 15 minutes.
        </p>
      </div>
    </div>
  );
}