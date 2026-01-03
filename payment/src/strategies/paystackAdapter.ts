/**
 * createPaystackAdapter
 * input: secretKey, publicKey
 * output: object => process, refund, virtual
 * 1. process: input(secret key, public key, amount, metadata: userId, phone, email)
 * output: transactionId, success, redirectUrl
 *
 */
import {
  IAdapterRequest,
  IPaymentProcessRequest,
  IPaymentResponse,
  IPaymentRefundRequest,
} from "../types";
import logger from "../utils/logger";
import axios from "axios";
import crypto from "crypto";

const createPaystackAdapter = ({ secretKey }: IAdapterRequest) => {
  if (!secretKey) {
    throw new Error("Paystack secret key is required");
  }

  const client = axios.create({
    baseURL: "https://api.paystack.co",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  return {
    // Initialize Payment
    async process(processBody: IPaymentProcessRequest): Promise<IPaymentResponse> {
      const { amount, callbackUrl, currency = "NGN", email, phone, userId, name } = processBody;

      const reference = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        const { data } = await client.post("/transaction/initialize", {
          amount: Math.round(Number(amount) * 100), 
          currency,
          email,
          reference,
          callback_url: callbackUrl,
          metadata: { userId, name, phone },
          channels: ["card", "bank", "ussd", "qr", "mobile_money"],
        });

        if (!data.status) {
          throw new Error(data.message || "Failed to initialize Paystack transaction");
        }

        return {
          success: true,
          message: "Payment initialized",
          transactionId: data.data.reference,
          redirectUrl: data.data.authorization_url,
        };
      } catch (error: any) {
        logger.error("Paystack initialize failed", {
          error: error.response?.data || error.message,
        });
        return {
          success: false,
          message: error.response?.data?.message || error.message || "Payment initialization failed",
        };
      }
    },

    // Refund
    async refund({ transactionId, amount, reason }: IPaymentRefundRequest): Promise<IPaymentResponse> {
      if (!transactionId) {
        return { success: false, message: "Transaction ID is required for refund" };
      }

      try {
        const payload: any = { transaction: transactionId };
        if (amount) payload.amount = Math.round(amount * 100);
        if (reason) payload.reason = reason;

        const { data } = await client.post("/refund", payload);

        return {
          success: data.status,
          message: data.message,
          transactionId: data.data?.refund_id || transactionId,
        };
      } catch (error: any) {
        logger.error("Paystack refund failed", {
          transactionId,
          error: error.response?.data || error.message,
        });
        return {
          success: false,
          message: error.response?.data?.message || "Refund failed",
        };
      }
    },

    verifyWebhook(payload: any, signature?: string): boolean {
      if (!signature) return false;

      const hash = crypto
        .createHmac("sha512", secretKey)
        .update(JSON.stringify(payload))
        .digest("hex");

      return hash === signature;
    },

    extractTransactionId(payload: any): string {
      return payload?.data?.reference || payload?.reference || "";
    },

    extractStatus(payload: any): "success" | "failed" | "pending" {
      const event = payload?.event;
      const status = payload?.data?.status;

      if (event === "charge.success" || status === "success") return "success";
      if (event === "charge.failed" || status === "failed") return "failed";
      return "pending";
    },

    extractAmount(payload: any): number {
      const amountInKobo = payload?.data?.amount || 0;
      return amountInKobo / 100;
    },

    extractMetadata(payload: any): Record<string, any> {
      return payload?.data?.metadata || {};
    },
  };
};

export default createPaystackAdapter;