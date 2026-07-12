import { renderEmailLayout } from "./emailShell";

export interface StoreOnboardingTemplateData {
  name:      string;
  storeName: string;
  storeUrl:  string;
  plan:      string;
}

export function storeOnboardingTemplate(
  data: StoreOnboardingTemplateData
): { subject: string; html: string } {
  const { name, storeName, storeUrl, plan } = data;

  return {
    subject: `Your Selleasi store "${storeName}" is live!`,
    html: renderEmailLayout({
      heading: `Your store is ready, ${name}`,
      intro: `<strong>${storeName}</strong> is now live on the <strong>${plan}</strong> plan.`,
      secondaryText: "Start adding products and accepting orders today.",
      cta: { label: "View your store", url: storeUrl },
      closingNote: `Questions? Email us at <a href="mailto:support@selleasi.com" style="color:#5d2a1a">support@selleasi.com</a>`,
    }),
  };
}