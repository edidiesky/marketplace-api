export interface LowStockTemplateData {
  inventoryId:       string;
  storeId:           string;
  productName:       string;
  quantityAvailable: number;
  reorderPoint:      number;
}

export function lowStockTemplate(
  data: LowStockTemplateData
): { subject: string; html: string } {
  const { inventoryId, storeId, productName, quantityAvailable, reorderPoint } = data;
  const inventoryUrl = `${process.env.WEB_ORIGIN}/stores/${storeId}/inventory/${inventoryId}`;

  return {
    subject: `Low stock alert: ${productName} - Selleasi`,
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
              <h1 style="margin:0 0 16px;font-size:28px;color:#e53e3e;font-weight:700">Low Stock Alert</h1>
              <p style="font-size:16px;line-height:28px;color:#2d3748;margin:0 0 24px">
                <strong>${productName}</strong> has dropped below its reorder threshold.
              </p>
              <table width="100%" cellpadding="8" cellspacing="0" style="background:#fff5f5;border-radius:8px;border:1px solid #fed7d7;margin:0 0 32px;text-align:left">
                <tr>
                  <td style="font-size:14px;color:#4a5566;padding:10px 16px"><strong>Current Stock</strong></td>
                  <td style="font-size:14px;color:#e53e3e;font-weight:700;padding:10px 16px">${quantityAvailable} units</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#4a5566;padding:10px 16px"><strong>Reorder Point</strong></td>
                  <td style="font-size:14px;color:#2d3748;padding:10px 16px">${reorderPoint} units</td>
                </tr>
              </table>
              <a href="${inventoryUrl}"
                 style="background:#e53e3e;color:#fff;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;display:inline-block">
                Restock Now
              </a>
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