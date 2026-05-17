import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { webhookService }  from "./webhook.service";
import { AppError }        from "../../utils/AppError";
import logger              from "../../utils/logger";
import { SERVICE_NAME, SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";
import { PaymentGateway }  from "../payment/payment.model";

const SIGNATURE_HEADERS: Partial<Record<PaymentGateway, string>> = {
  [PaymentGateway.PAYSTACK]:    "x-paystack-signature",
  [PaymentGateway.FLUTTERWAVE]: "verif-hash",
};

export const HandleWebhookHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const gateway = req.params["gateway"] as PaymentGateway;

    if (!Object.values(PaymentGateway).includes(gateway)) {
      throw AppError.badRequest("Unsupported gateway.");
    }

    const signatureHeader = SIGNATURE_HEADERS[gateway];
    const signature       = signatureHeader
      ? (req.headers[signatureHeader] as string)
      : undefined;

    try {
      await webhookService.process(gateway, req.body, signature);
    } catch (err) {
      logger.error("webhook_handler_error", {
        event:   "webhook_handler_error",
        service: SERVICE_NAME,
        gateway,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message: "Received." });
  }
);