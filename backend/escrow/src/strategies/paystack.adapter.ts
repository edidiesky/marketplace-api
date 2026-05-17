import axios  from "axios";
import crypto from "crypto";
import logger from "../utils/logger";
import { SERVICE_NAME } from "../constants";
import {
  IAdapterRequest,
  IAdapterResponse,
  IPaymentProcessRequest,
  IPaymentRefundRequest,
  IPaymentResponse,
} from "./index";

const createPaystackAdapter = ({ secretKey }: IAdapterRequest): IAdapterResponse => {
  if (!secretKey) throw new Error("Paystack secret key is required.");

  const client = axios.create({
    baseURL: "https://api.paystack.co",
    headers: {
      Authorization:  `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  return {
    async process(body: IPaymentProcessRequest): Promise<IPaymentResponse> {
      const { amount, callbackUrl, currency = "NGN", email, phone, userId, name } = body;
      const reference = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const { data } = await client.post("/transaction/initialize", {
          amount:       Math.round(Number(amount) * 100),
          currency,
          email,
          reference,
          callback_url: callbackUrl,
          metadata:     { userId, name, phone },
          channels:     ["card", "bank", "ussd", "qr", "mobile_money"],
        });

        if (!data.status) {
          throw new Error(data.message ?? "Failed to initialize Paystack transaction.");
        }

        return {
          success:       true,
          message:       "Payment initialized.",
          transactionId: data.data.reference,
          redirectUrl:   data.data.authorization_url,
        };
      } catch (err) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        logger.error("paystack_initialize_failed", {
          event:   "paystack_initialize_failed",
          service: SERVICE_NAME,
          error:   error.response?.data?.message ?? error.message,
        });
        return {
          success: false,
          message: error.response?.data?.message ?? error.message ?? "Payment initialization failed.",
        };
      }
    },

    async refund({ transactionId, amount, reason }: IPaymentRefundRequest): Promise<IPaymentResponse> {
      if (!transactionId) {
        return { success: false, message: "Transaction ID is required for refund." };
      }

      try {
        const payload: Record<string, unknown> = { transaction: transactionId };
        if (amount) payload["amount"] = Math.round(amount * 100);
        if (reason) payload["reason"] = reason;

        const { data } = await client.post("/refund", payload);

        return {
          success:       data.status,
          message:       data.message,
          transactionId: data.data?.refund_id ?? transactionId,
        };
      } catch (err) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        logger.error("paystack_refund_failed", {
          event:         "paystack_refund_failed",
          service:       SERVICE_NAME,
          transactionId,
          error:         error.response?.data?.message ?? error.message,
        });
        return {
          success: false,
          message: error.response?.data?.message ?? "Refund failed.",
        };
      }
    },

    verifyWebhook(payload: unknown, signature?: string): boolean {
      if (!signature) return false;
      const hash = crypto
        .createHmac("sha512", secretKey)
        .update(JSON.stringify(payload))
        .digest("hex");
      return hash === signature;
    },

    extractTransactionId(payload: unknown): string {
      const p = payload as Record<string, Record<string, string>>;
      return p?.["data"]?.["reference"] ?? "";
    },

    extractStatus(payload: unknown): "success" | "failed" | "pending" {
      const p      = payload as Record<string, string | Record<string, string>>;
      const event  = p?.["event"] as string;
      const status = (p?.["data"] as Record<string, string>)?.["status"];
      if (event === "charge.success" || status === "success") return "success";
      if (event === "charge.failed"  || status === "failed")  return "failed";
      return "pending";
    },

    extractAmount(payload: unknown): number {
      const p = payload as Record<string, Record<string, number>>;
      return (p?.["data"]?.["amount"] ?? 0) / 100;
    },

    extractMetadata(payload: unknown): Record<string, unknown> {
      const p = payload as Record<string, Record<string, unknown>>;
      return (p?.["data"]?.["metadata"] as Record<string, unknown>) ?? {};
    },
  };
};

export default createPaystackAdapter;