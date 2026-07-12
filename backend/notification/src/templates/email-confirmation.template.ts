import { renderEmailLayout } from "./emailShell";

export interface EmailConfirmationTemplateData {
  firstName:        string;
  lastName:         string;
  verificationUrl:  string;
}

export function emailConfirmationTemplate(
  data: EmailConfirmationTemplateData
): { subject: string; html: string } {
  const { firstName, lastName, verificationUrl } = data;
  const name = `${firstName} ${lastName}`.trim();

  return {
    subject: "Confirm your Selleasi email address",
    html: renderEmailLayout({
      heading: "Confirm your email",
      intro: `Hi ${name}, please confirm your email address to complete your Selleasi account setup.`,
      cta: { label: "Confirm email address", url: verificationUrl },
      closingNote: "This link expires in 24 hours. If you did not create a Selleasi account, ignore this email.",
    }),
  };
}