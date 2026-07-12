import { renderEmailLayout } from "./emailShell";

export interface OrgOnboardingTemplateData {
  firstName: string;
  lastName:  string;
  plan:      string;
}

export function orgOnboardingTemplate(
  data: OrgOnboardingTemplateData
): { subject: string; html: string } {
  const { firstName, lastName, plan } = data;
  const name = `${firstName} ${lastName}`.trim();

  return {
    subject: "Welcome to Selleasi! Your account is ready.",
    html: renderEmailLayout({
      heading: `Welcome to Selleasi, ${name}`,
      intro: `Your account is ready. You're on the <strong>${plan}</strong> plan with a 7-day free trial.`,
      cta: { label: "Go to dashboard", url: `${process.env.WEB_ORIGIN}/dashboard` },
      closingNote: `Questions? Email us at <a href="mailto:support@selleasi.com" style="color:#5d2a1a">support@selleasi.com</a>`,
    }),
  };
}