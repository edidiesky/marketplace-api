import axios  from "axios";
import logger from "../utils/logger";
import { SERVICE_NAME } from "../constants";
import {
  IAdapterRequest,
  IAdapterResponse,
  IPaymentProcessRequest,
  IPaymentResponse,
} from "./index";

const createFlutterwaveAdapter = ({ secretKey }: IAdapterRequest): IAdapterResponse => {
  return {
    async process(body: IPaymentProcessRequest): Promise<IPaymentResponse> {
      const { amount, callbackUrl, currency, email, phone, userId, name } = body;
      const timestamp     = Date.now().toString().slice(-4);
      const numericSuffix = Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0");

      try {
        if (!callbackUrl) {
          throw new Error("Callback URL is required for Flutterwave payment.");
        }

        const { data } = await axios.post(
          "https://api.flutterwave.com/v3/payments",
          {
            tx_ref:       `${userId}${timestamp}${numericSuffix}`,
            amount,
            currency,
            redirect_url: callbackUrl,
            customer: {
              email,
              name,
              phonenumber: phone,
              userId,
            },
            customizations: {
              title:       "Selleasi Payment",
              description: "Payment for item purchased at Selleasi stores",
            },
          },
          {
            headers: {
              Authorization:  `Bearer ${secretKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        return {
          success:       true,
          message:       "Payment initialized.",
          redirectUrl:   data.data.link,
          transactionId: data.data?.reference,
        };
      } catch (err) {
        const error = err as { message?: string };
        logger.error("flutterwave_initialize_failed", {
          event:   "flutterwave_initialize_failed",
          service: SERVICE_NAME,
          error:   error.message,
        });
        return {
          success: false,
          message: error.message ?? "Payment initialization failed.",
        };
      }
    },

    extractTransactionId(payload: unknown): string {
      const p = payload as Record<string, Record<string, string>>;
      return p?.["data"]?.["flw_ref"] ?? p?.["data"]?.["tx_ref"] ?? "";
    },

    extractStatus(payload: unknown): "success" | "failed" | "pending" {
      const p      = payload as Record<string, Record<string, string>>;
      const status = p?.["data"]?.["status"];
      if (status === "successful") return "success";
      if (status === "failed")     return "failed";
      return "pending";
    },

    extractAmount(payload: unknown): number {
      const p = payload as Record<string, Record<string, number>>;
      return p?.["data"]?.["amount"] ?? 0;
    },

    extractMetadata(payload: unknown): Record<string, unknown> {
      const p = payload as Record<string, Record<string, unknown>>;
      return (p?.["data"]?.["meta"] as Record<string, unknown>) ?? {};
    },
  };
};

export default createFlutterwaveAdapter;