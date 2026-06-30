import { Request, Response } from "express";
import { orderRepository } from "../order/order.repository";
import { buildReceiptHtml } from "../../templates/Receipttemplate";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";

/**
 * GET /orders/:orderId/receipt/preview
 *
 * Returns the raw receipt HTML (not a PDF) so it can be opened directly
 * in a browser tab for visual debugging of the template — fonts, layout,
 * spacing — without round-tripping through Puppeteer on every change.
 *
 * Guarded behind NODE_ENV !== "production" by default. If you need this
 * in staging/prod too, gate it with an internal-only auth check instead
 * of removing the guard entirely.
 */
export async function PreviewReceiptHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw AppError.forbidden("Receipt preview is not available in production.");
  }

  const orderId = req.params["orderId"] as string;
  const order = await orderRepository.findById(orderId);

  if (!order) {
    throw AppError.notFound("Order not found.");
  }

  const verificationUrl = `${process.env.WEB_ORIGIN}/orders/${order._id.toString()}/verify`;

  const html = buildReceiptHtml({
    order,
    storeName: req.query["storeName"]?.toString() ?? "Preview Store",
    transactionId: req.query["transactionId"]?.toString() ?? "TXN-PREVIEW",
    paymentDate: new Date(),
    verificationUrl,
  });

  logger.info("receipt_preview_rendered", {
    event: "receipt_preview_rendered",
    orderId,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}