import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Buffer } from "buffer";
import logger from "./logger";
import { IOrder } from "../models/Order";

interface ReceiptData {
  order: IOrder;
  storeName: string;
  transactionId: string;
  paymentDate: Date;
  platformFeeRate?: number;
}

export async function generateReceiptBuffer(data: ReceiptData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const margin = 40;

      // Header
      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text("Selleasi", margin, 40);

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#666666")
        .text("Marketplace Receipt", margin, 68);

      // Invoice label top right
      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text("Receipt", pageWidth - 200, 40, { width: 160, align: "right" });

      doc
        .fontSize(13)
        .font("Helvetica")
        .fillColor("#888888")
        .text(`#${data.order._id.toString().slice(-8).toUpperCase()}`, pageWidth - 200, 72, {
          width: 160,
          align: "right",
        });

      // Divider
      doc
        .moveTo(margin, 100)
        .lineTo(pageWidth - margin, 100)
        .strokeColor("#e0e0e0")
        .lineWidth(0.5)
        .stroke();

      // Buyer and store info columns
      const colLeft = margin;
      const colRight = pageWidth / 2 + 20;
      let y = 120;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#888888")
        .text("FROM", colLeft, y)
        .text("BILLED TO", colRight, y);

      y += 18;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text(data.storeName, colLeft, y)
        .text(data.order.fullName, colRight, y);

      y += 16;

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text("via Selleasi Platform", colLeft, y);

      // Dates and amounts right column
      const dateColLabel = colRight;
      const dateColValue = colRight + 120;

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text("Issue Date", dateColLabel, y)
        .text(
          new Date().toLocaleDateString("en-NG", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          dateColValue,
          y
        );

      y += 16;

      doc
        .text("Payment Date", dateColLabel, y)
        .text(
          new Date(data.paymentDate).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          dateColValue,
          y
        );

      y += 16;

      doc
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text("Amount Paid", dateColLabel, y)
        .text(
          `NGN ${Number(data.order.totalPrice).toLocaleString("en-NG", {
            minimumFractionDigits: 2,
          })}`,
          dateColValue,
          y
        );

      y += 40;

      // Divider
      doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor("#e0e0e0")
        .lineWidth(0.5)
        .stroke();

      y += 20;

      // Items table header
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#888888")
        .text("ITEM", colLeft, y)
        .text("QTY", pageWidth - 220, y, { width: 60, align: "right" })
        .text("UNIT PRICE", pageWidth - 160, y, { width: 80, align: "right" })
        .text("TOTAL", pageWidth - margin - 70, y, { width: 70, align: "right" });

      y += 6;

      doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor("#e0e0e0")
        .lineWidth(0.5)
        .stroke();

      y += 14;

      // Items
      for (const item of data.order.cartItems) {
        const itemTotal = item.productPrice * item.productQuantity;

        doc
          .fontSize(11)
          .font("Helvetica")
          .fillColor("#1a1a1a")
          .text(item.productTitle, colLeft, y, { width: 220 })
          .text(String(item.productQuantity), pageWidth - 220, y, {
            width: 60,
            align: "right",
          })
          .text(
            `NGN ${Number(item.productPrice).toLocaleString("en-NG", {
              minimumFractionDigits: 2,
            })}`,
            pageWidth - 160,
            y,
            { width: 80, align: "right" }
          )
          .text(
            `NGN ${Number(itemTotal).toLocaleString("en-NG", {
              minimumFractionDigits: 2,
            })}`,
            pageWidth - margin - 70,
            y,
            { width: 70, align: "right" }
          );

        y += 22;
      }

      y += 10;

      doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor("#e0e0e0")
        .lineWidth(0.5)
        .stroke();

      y += 16;

      // Totals block
      const totalLabelX = pageWidth - 230;
      const totalValueX = pageWidth - margin - 70;

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#666666")
        .text("Subtotal", totalLabelX, y, { width: 130, align: "left" })
        .text(
          `NGN ${Number(data.order.totalPrice).toLocaleString("en-NG", {
            minimumFractionDigits: 2,
          })}`,
          totalValueX,
          y,
          { width: 70, align: "right" }
        );

      y += 18;

      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text("Total", totalLabelX, y, { width: 130, align: "left" })
        .text(
          `NGN ${Number(data.order.totalPrice).toLocaleString("en-NG", {
            minimumFractionDigits: 2,
          })}`,
          totalValueX,
          y,
          { width: 70, align: "right" }
        );

      y += 50;

      // Transaction details
      doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor("#e0e0e0")
        .lineWidth(0.5)
        .stroke();

      y += 20;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#888888")
        .text("TRANSACTION DETAILS", margin, y);

      y += 16;

      const txDetails = [
        { label: "Transaction ID", value: data.transactionId },
        { label: "Order ID", value: data.order._id.toString() },
        { label: "Saga ID", value: data.order.sagaId },
        { label: "Payment Status", value: "COMPLETED" },
        { label: "Payment Method", value: "Card" },
      ];

      for (const tx of txDetails) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#666666")
          .text(tx.label, margin, y, { width: 160 })
          .fillColor("#1a1a1a")
          .text(tx.value, margin + 160, y, { width: 350 });
        y += 16;
      }

      y += 20;

      // QR code
      try {
        const verificationUrl = `${
          process.env.WEB_ORIGIN
        }/orders/${data.order._id.toString()}/verify`;

        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          errorCorrectionLevel: "M",
          type: "image/png",
          margin: 1,
          scale: 8,
        });

        doc.image(qrDataUrl, margin, y, { width: 70 });

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#888888")
          .text("Scan to verify order", margin, y + 74, { width: 70, align: "center" });
      } catch (qrErr: any) {
        logger.warn("QR code generation failed, skipping", { error: qrErr.message });
      }

      // Footer
      const footerY = doc.page.height - 60;

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#aaaaaa")
        .text(
          "This is a system-generated receipt and does not require a signature.",
          margin,
          footerY,
          { width: pageWidth - margin * 2, align: "center" }
        )
        .text("Selleasi Marketplace | support@selleasi.com", margin, footerY + 14, {
          width: pageWidth - margin * 2,
          align: "center",
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}