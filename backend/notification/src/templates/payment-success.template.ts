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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#4a5566">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td height="40"></td></tr>
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.05)">
          <tr>
            <td style="padding:50px 60px;text-align:center">
              <h1 style="margin:0 0 16px;font-size:28px;color:#111;font-weight:700">Payment Confirmed</h1>
              <p style="font-size:16px;line-height:28px;color:#2d3748;margin:0 0 24px">
                Hi ${customerName}, your payment of <strong>${currency} ${amount.toLocaleString()}</strong> has been received.
              </p>
              <table width="100%" cellpadding="8" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 32px;text-align:left">
                <tr>
                  <td style="font-size:14px;color:#4a5566;padding:10px 16px"><strong>Order ID</strong></td>
                  <td style="font-size:14px;color:#2d3748;padding:10px 16px">${orderId}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#4a5566;padding:10px 16px"><strong>Transaction ID</strong></td>
                  <td style="font-size:14px;color:#2d3748;padding:10px 16px">${transactionId}</td>
                </tr>
              </table>
              ${receiptUrl ? `
              <a href="${receiptUrl}"
                 style="background:#0066cc;color:#fff;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;display:inline-block">
                Download Receipt
              </a>` : ""}
              <p style="font-size:13px;color:#96a2b3;margin:32px 0 0">
                Thank you for shopping on Selleasi.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td height="40"></td></tr>
  </table>
</body>
</html>`,
  };
}