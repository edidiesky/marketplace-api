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
              <h1 style="margin:0 0 16px;font-size:28px;color:#111;font-weight:700">Your store is ready, ${name}!</h1>
              <p style="font-size:16px;line-height:28px;color:#2d3748;margin:0 0 8px">
                <strong>${storeName}</strong> is now live on the <strong>${plan}</strong> plan.
              </p>
              <p style="font-size:15px;color:#2d3748;margin:0 0 32px">
                Start adding products and accepting orders today.
              </p>
              <a href="${storeUrl}"
                 style="background:#0066cc;color:#fff;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;display:inline-block">
                View Your Store
              </a>
              <p style="font-size:13px;color:#96a2b3;margin:32px 0 0">
                Questions? Email us at <a href="mailto:support@selleasi.com" style="color:#0066cc">support@selleasi.com</a>
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