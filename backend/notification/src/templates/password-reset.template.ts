import { renderEmailLayout } from "./emailShell";

export interface PasswordResetTemplateData {
  firstName:  string;
  resetUrl:   string;
}

export function passwordResetTemplate(
  data: PasswordResetTemplateData
): { subject: string; html: string } {
  const { firstName, resetUrl } = data;

  return {
    subject: "Reset your Selleasi password",
    html: renderEmailLayout({
      heading: "Reset your password",
      intro: `Hi ${firstName}, click below to reset your Selleasi password. This link expires in 1 hour.`,
      cta: { label: "Reset password", url: resetUrl },
      closingNote: "If you did not request a password reset, ignore this email. Your password will not change.",
    }),
  };
}