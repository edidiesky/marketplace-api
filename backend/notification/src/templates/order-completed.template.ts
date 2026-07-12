import { renderEmailLayout } from "./emailShell";

export interface OrderCompletedTemplateData {
  customerName: string;
  orderId:      string;
  receiptUrl?:  string;
  storeId:      string;
}

export function orderCompletedTemplate(
  data: OrderCompletedTemplateData
): { subject: string; html: string } {
  const { customerName, orderId, receiptUrl } = data;
  const trackUrl = `${process.env.WEB_ORIGIN}/orders/${orderId}`;

  return {
    subject: "Your Selleasi order is confirmed!",
    html: renderEmailLayout({
      heading: "Order confirmed",
      intro: `Hi ${customerName}, your order <strong>${orderId}</strong> has been confirmed and is being prepared.`,
      secondaryText: "You'll get an update as soon as your order is dispatched.",
      cta: { label: "Track your order", url: trackUrl },
      secondaryLink: receiptUrl ? { label: "Download receipt", url: receiptUrl } : undefined,
      closingNote: "Thank you for shopping on Selleasi.",
    }),
  };
}