import {
  IAdapterRequest,
  IPaymentProcessRequest,
  IPaymentResponse,
} from "../types";
import logger from "../utils/logger";
import axios from "axios";

const createFlutterWaveAdapter = (req: IAdapterRequest) => {
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
        logger.info("callbackUrl log:", callbackUrl);
        if (!callbackUrl) {
          throw new Error("Callback URL is required for Flutterwave payment");
        }
        const {data} = await axios.post(
          "https://api.flutterwave.com/v3/payments",
          {
            tx_ref: `${userId}${timestamp}${numericSuffix}`,
            amount,
            currency,
            redirect_url: callbackUrl,
            customer: {
              email,
              name,
              phonenumber: phone,
              userId
            },
            customizations: {
              title: "SellEazy Payment",
              description: "Payment for item both at SellEazy stores",
            },
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
          redirectUrl: data.data.link,
          transactionId: data.data?.reference,
        };

        logger.info("Flutterwave API successfully created:", {
          success: result.success,
          redirectUrl: data.data.link,
        });
        return result;
      } catch (error) {
        logger.error("Flutterwave Payment billing API error did occurred:", {
          message:
            error instanceof Error
              ? error.message
              : "An unknown Fluttewave error",
          stack:
            error instanceof Error ? error.stack : "An unknown Fluttewave error",
        });
        return {
          message:
            error instanceof Error
              ? error.message
              : "An unknown Fluttewave error",
          success: false,
        };
      }
    },
    // async virtual(processBody) {},
    // async refund(processBody) {},
  };
};


export default createFlutterWaveAdapter