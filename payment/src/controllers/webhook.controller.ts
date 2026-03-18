import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PaymentGateway } from "../models/Payment";
import { webhookService } from "../services/webhook.service";
import { BAD_REQUEST_STATUS_CODE, SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import logger from "../utils/logger";

const SIGNATURE_HEADERS: Partial<Record<PaymentGateway, string>> = {
  [PaymentGateway.PAYSTACK]: "x-paystack-signature",
  [PaymentGateway.FLUTTERWAVE]: "verif-hash",
};

export const handleWebhook = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const gateway = req.params.gateway as PaymentGateway;

    if (!Object.values(PaymentGateway).includes(gateway)) {
      res.status(BAD_REQUEST_STATUS_CODE).json({ message: "Unsupported gateway" });
      return;
    }

    const signatureHeader = SIGNATURE_HEADERS[gateway];
    const signature = signatureHeader
      ? (req.headers[signatureHeader] as string)
      : undefined;

    try {
      await webhookService.process(gateway, req.body, signature);
      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message: "Received" });
    } catch (err: any) {
      logger.error("Webhook handler error", { gateway, error: err.message });

      if (err.message.toLowerCase().includes("signature")) {
        res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message: "Received" });
        return;
      }
      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message: "Received" });
    }
  }
);