import { renderEmailLayout } from "./emailShell";

export interface PaymentSuccessTemplateData {
  customerName:  string;
  orderId:       string;
  amount:        number;
  currency:      string;
  transactionId: string;
  receiptUrl?:   string;
}

export function paymentSuccessTemplate(
  data: PaymentSuccessTemplateData
): { subject: string; html: string } {
  const { customerName, orderId, amount, currency, transactionId, receiptUrl } = data;

  return {
    subject: "Payment confirmed - Selleasi",
    html: renderEmailLayout({
      heading: "Payment confirmed",
      intro: `Hi ${customerName}, your payment of <strong>${currency} ${amount.toLocaleString()}</strong> has been received.`,
      infoRows: [
        { label: "Order ID", value: orderId },
        { label: "Transaction ID", value: transactionId },
      ],
      cta: receiptUrl ? { label: "Download receipt", url: receiptUrl } : undefined,
      closingNote: "Thank you for shopping on Selleasi.",
    }),
  };
}