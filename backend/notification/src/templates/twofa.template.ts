import { renderEmailLayout } from "./emailShell";

export interface TwoFATemplateData {
  fullName: string;
  token:    string;
}

export function twoFATemplate(
  data: TwoFATemplateData
): { subject: string; html: string } {
  const { fullName, token } = data;

  return {
    subject: "Your Selleasi verification code",
    html: renderEmailLayout({
      heading: "Verification code",
      intro: `Hi ${fullName}, use the code below to complete your sign-in.`,
      codeBlock: token,
      closingNote: "This code expires in 10 minutes. Do not share it with anyone.",
    }),
  };
}

export function twoFASmsMessage(token: string): string {
  return `Your Selleasi verification code is: ${token}. It expires in 10 minutes. Do not share this code.`;
}