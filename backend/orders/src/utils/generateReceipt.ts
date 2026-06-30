import { Buffer } from "buffer";
import logger from "./logger";
import { generatePdfFromHtml } from "../config/puppeteer.singleton";
import { buildReceiptHtml } from "../templates/Receipttemplate";
import { IOrder } from "../domains/order/order.model";

interface ReceiptData {
  order: IOrder;
  storeName: string;
  transactionId: string;
  paymentDate: Date;
}

export async function generateReceiptBuffer(data: ReceiptData): Promise<Buffer> {
  const verificationUrl = `${process.env.WEB_ORIGIN}/orders/${data.order._id.toString()}/verify`;

  const html = buildReceiptHtml({
    order: data.order,
    storeName: data.storeName,
    transactionId: data.transactionId,
    paymentDate: data.paymentDate,
    verificationUrl,
  });

  try {
    const buffer = await generatePdfFromHtml(html);

    logger.info("receipt_pdf_generated", {
      event: "receipt_pdf_generated",
      orderId: data.order._id.toString(),
      bytes: buffer.length,
    });

    return buffer;
  } catch (err) {
    logger.error("receipt_pdf_generation_failed", {
      event: "receipt_pdf_generation_failed",
      orderId: data.order._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}