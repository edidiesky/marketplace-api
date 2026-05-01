import {
  IAdapterRequest,
  IPaymentProcessRequest,
  IPaymentResponse,
  IPaystackResponse,
} from "../types";
import logger from "../utils/logger";
import axios from "axios";

const createInterswitchAdapter = (req: IAdapterRequest) => {
  const { secretKey } = req;
  return {
    async process(processBody: IPaymentProcessRequest) {
      const { amount, callbackUrl, currency, email, phone, userId, name } =
        processBody;
      const timestamp = Date.now().toString().slice(-4);
      const numericSuffix = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
      try {
        const { data } = await axios.post<IPaystackResponse>(
          "https://api.paystack.co/transaction/initialize",
          {
            amount: Number(amount) * 100,
            currency,
            email,
            reference: `${timestamp}${numericSuffix}`,
            metadata: { name, phone, userId },
            callback_url: callbackUrl,
            channels: ["card"],
          },

          {
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const result: IPaymentResponse = {
          message: "",
          success: true,
          redirectUrl: data?.data?.authorization_url,
          transactionId: data.data?.reference,
        };

        logger.info("PayStack API successfully created:", {
          success: result.success,
          redirectUrl: data?.data?.authorization_url,
        });
        return result;
      } catch (error) {
        logger.error("Payment billing API error did occurred:", {
          message:
            error instanceof Error
              ? error.message
              : "An unknown Paystack error",
          stack:
            error instanceof Error ? error.stack : "An unknown Paystack error",
        });
        return {
          message:
            error instanceof Error
              ? error.message
              : "An unknown Paystack error",
          success: false,
        };
      }
    },
    // async virtual(processBody) {},
    // async refund(processBody) {},
  };
};


export default createInterswitchAdapter