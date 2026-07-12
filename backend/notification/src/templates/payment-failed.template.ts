import { renderEmailLayout, EMAIL_TOKENS } from "./emailShell";

export interface PaymentFailedTemplateData {
  customerName: string;
  orderId:      string;
  reason?:      string;
  retryUrl:     string;
}

export function paymentFailedTemplate(
  data: PaymentFailedTemplateData
): { subject: string; html: string } {
  const { customerName, orderId, reason, retryUrl } = data;

  return {
    subject: "Payment failed - Selleasi",
    html: renderEmailLayout({
      heading: "Payment failed",
      headingColor: EMAIL_TOKENS.destructive,
      intro: `Hi ${customerName}, we couldn't process your payment for order <strong>${orderId}</strong>.`,
      secondaryText: reason ? `Reason: ${reason}` : undefined,
      cta: { label: "Retry payment", url: retryUrl },
      closingNote: `Need help? Contact us at <a href="mailto:support@selleasi.com" style="color:#5d2a1a">support@selleasi.com</a>`,
    }),
  };
}