import { renderEmailLayout } from "./emailShell";

export interface TwoFATemplateData {
  fullName:     string;
  token:        string;
  ip?:          string;
  requestedAt?: string;
}

export function twoFATemplate(
  data: TwoFATemplateData
): { subject: string; html: string } {
  const { fullName, token, ip, requestedAt } = data;

  const infoRows = [
    ip ? { label: "IP address", value: ip } : null,
    requestedAt
      ? {
          label: "Time",
          value: new Date(requestedAt).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        }
      : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return {
    subject: "Your Selleasi verification code",
    html: renderEmailLayout({
      heading: "Verification code",
      intro: `Hi ${fullName}, use the code below to complete your sign-in.`,
      codeBlock: token,
      infoRows,
      closingNote: "This code expires in 10 minutes. If you did not request this, you can safely ignore this email, do not share the code with anyone.",
    }),
  };
}

export function twoFASmsMessage(token: string): string {
  return `Your Selleasi verification code is: ${token}. It expires in 10 minutes. Do not share this code.`;
}