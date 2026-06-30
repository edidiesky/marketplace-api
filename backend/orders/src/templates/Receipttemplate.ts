import { IOrder } from "../domains/order/order.model";
import { getBase64Fonts } from "../utils/fontLoader";

interface ReceiptData {
  order: IOrder;
  storeName: string;
  transactionId: string;
  paymentDate: Date;
  verificationUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtNaira(n: number): string {
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

const LOGO_SVG = `
<svg width="120" height="28" viewBox="0 0 120 28" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="21" font-family="'Cabinet', sans-serif" font-size="22" font-weight="700" fill="#1a1a1a">Selleasi</text>
</svg>`;

function buildAddressBlock(label: string, lines: string[]): string {
  const rows = lines
    .filter(Boolean)
    .map((l) => `<div class="addr-line">${escapeHtml(l)}</div>`)
    .join("");
  return `
  <div class="addr-col">
    <div class="addr-label">${label}</div>
    ${rows}
  </div>`;
}

function buildItemRows(order: IOrder): string {
  return order.cartItems
    .map((item) => {
      const lineTotal = item.productPrice * item.productQuantity;
      return `
      <tr class="item-row">
        <td class="item-desc">
          <div class="item-title">${escapeHtml(item.productTitle)}</div>
        </td>
        <td class="item-qty">${item.productQuantity}</td>
        <td class="item-unit">${fmtNaira(item.productPrice)}</td>
        <td class="item-amount">${fmtNaira(lineTotal)}</td>
      </tr>`;
    })
    .join("");
}

export function buildReceiptHtml(data: ReceiptData): string {
  const { order, storeName, transactionId, paymentDate, verificationUrl } =
    data;

  const orderShortId = shortId(order._id.toString());
  const issueDate = fmtDate(new Date());
  const paidDate = fmtDate(paymentDate);

  const fromBlock = buildAddressBlock("From", [
    storeName,
    "via Selleasi Marketplace",
    "support@selleasi.com",
  ]);

  const billToBlock = buildAddressBlock("Bill to", [
    order.fullName,
    order.shipping?.address ?? "",
    [order.shipping?.city, order.shipping?.state].filter(Boolean).join(", "),
    order.shipping?.country ?? "",
    order.shipping?.phone ?? "",
  ]);

  const itemRows = buildItemRows(order);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Selleasi Receipt ${orderShortId}</title>
<style>
${buildStyles()}
</style>
</head>
<body>
  <div class="page">

    <div class="header-row">
      <h1 class="doc-title">Invoice</h1>
      <div class="logo">${LOGO_SVG}</div>
    </div>

    <div class="meta-row">
      <div class="meta-item">
        <span class="meta-label">Invoice number</span>
        <span class="meta-value">${orderShortId}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Date of issue</span>
        <span class="meta-value">${issueDate}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Date paid</span>
        <span class="meta-value">${paidDate}</span>
      </div>
    </div>

    <div class="addr-row">
      ${fromBlock}
      ${billToBlock}
    </div>

    <div class="due-row">
      <div class="due-amount">${fmtNaira(order.totalPrice)} paid on ${paidDate}</div>
      <a class="verify-link" href="${verificationUrl}">Verify this order</a>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th class="th-desc">Description</th>
          <th class="th-qty">Qty</th>
          <th class="th-unit">Unit price</th>
          <th class="th-amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals-block">
      <div class="totals-row">
        <span class="totals-label">Subtotal</span>
        <span class="totals-value">${fmtNaira(order.totalPrice)}</span>
      </div>
      <div class="totals-row totals-row--total">
        <span class="totals-label">Total</span>
        <span class="totals-value">${fmtNaira(order.totalPrice)}</span>
      </div>
      <div class="totals-row totals-row--paid">
        <span class="totals-label">Amount paid</span>
        <span class="totals-value">${fmtNaira(order.totalPrice)}</span>
      </div>
    </div>

    <div class="tx-block">
      <div class="tx-label">Transaction details</div>
      <div class="tx-row"><span class="tx-key">Transaction ID</span><span class="tx-val">${escapeHtml(transactionId)}</span></div>
      <div class="tx-row"><span class="tx-key">Order ID</span><span class="tx-val">${escapeHtml(order._id.toString())}</span></div>
      <div class="tx-row"><span class="tx-key">Saga ID</span><span class="tx-val">${escapeHtml(order.sagaId)}</span></div>
      <div class="tx-row"><span class="tx-key">Payment status</span><span class="tx-val">Completed</span></div>
    </div>

    <div class="footer">
      This is a system-generated receipt and does not require a signature.<br/>
      Selleasi Marketplace &middot; support@selleasi.com
    </div>

  </div>
</body>
</html>`;
}

function buildStyles(): string {
  const fonts = getBase64Fonts();

  return `
@font-face {
  font-family: 'Cabinet';
  font-weight: 400;
  font-style: normal;
  src: url('data:font/truetype;base64,${fonts.regular}') format('truetype');
}
@font-face {
  font-family: 'Cabinet';
  font-weight: 500;
  font-style: normal;
  src: url('data:font/truetype;base64,${fonts.medium}') format('truetype');
}
@font-face {
  font-family: 'Cabinet';
  font-weight: 700;
  font-style: normal;
  src: url('data:font/truetype;base64,${fonts.bold}') format('truetype');
}

* { margin: 0; padding: 0; box-sizing: border-box; }

@page { size: A4; margin: 0; }

html, body {
  font-family: 'Cabinet', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: #1a1a1a;
  line-height: 1.55;
  background: #fff;
}

.page {
  width: 210mm;
  min-height: 297mm;
  padding: 18mm 18mm 24mm;
  box-sizing: border-box;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.doc-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
}

.logo { line-height: 0; }

.meta-row {
  display: flex;
  gap: 36px;
  margin-bottom: 28px;
}
.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-label { font-size: 11px; font-weight: 400; color: #6b6b6b; }
.meta-value { font-size: 13px; font-weight: 500; color: #1a1a1a; }

.addr-row {
  display: flex;
  gap: 60px;
  margin-bottom: 28px;
}
.addr-col { flex: 1; }
.addr-label { font-size: 11px; font-weight: 700; color: #6b6b6b; margin-bottom: 6px; }
.addr-line { font-size: 13px; font-weight: 400; color: #1a1a1a; }

.due-row {
  margin-bottom: 28px;
}
.due-amount {
  font-size: 19px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
}
.verify-link {
  font-size: 13px;
  font-weight: 500;
  color: #E56000;
  text-decoration: underline;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
}
.items-table thead tr { border-bottom: 1px solid #1a1a1a; }
.items-table th {
  font-size: 11px;
  font-weight: 500;
  color: #6b6b6b;
  text-align: left;
  padding: 0 0 8px;
}
.th-qty, .th-unit, .th-amount { text-align: right; }

.item-row td {
  padding: 10px 0;
  border-bottom: 1px solid #eaeaea;
  font-size: 13px;
  font-weight: 400;
  vertical-align: top;
}
.item-title { font-weight: 500; color: #1a1a1a; }
.item-qty, .item-unit, .item-amount { text-align: right; white-space: nowrap; }

.totals-block {
  width: 260px;
  margin-left: auto;
  margin-bottom: 36px;
}
.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  font-weight: 400;
  color: #444;
}
.totals-row--total {
  border-top: 1px solid #eaeaea;
  margin-top: 4px;
  padding-top: 10px;
  font-weight: 700;
  color: #1a1a1a;
}
.totals-row--paid {
  font-weight: 700;
  color: #1a1a1a;
}

.tx-block {
  border-top: 1px solid #eaeaea;
  padding-top: 16px;
  margin-bottom: 36px;
}
.tx-label {
  font-size: 11px;
  font-weight: 700;
  color: #6b6b6b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.tx-row { display: flex; font-size: 12px; font-weight: 400; padding: 4px 0; }
.tx-key { width: 150px; color: #6b6b6b; flex-shrink: 0; }
.tx-val { color: #1a1a1a; word-break: break-all; }

.footer {
  font-size: 11px;
  font-weight: 400;
  color: #9a9a9a;
  text-align: center;
  margin-top: 24px;
}
`;
}