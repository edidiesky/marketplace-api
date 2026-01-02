import { PaymentGateway } from "../models/Payment";
import createPaystackAdapter from "./paystackAdapter";
import { IAdapterResponse, IClassAdapterCred } from "../types";
import createFlutterWaveAdapter from "./flutterwaveAdapter";

class PaymentAdapter {
  private stategies: Record<PaymentGateway, IAdapterResponse>;
  constructor() {
    this.stategies = {
      [PaymentGateway.PAYSTACK]: createPaystackAdapter({
        secretKey: process.env.PAYSTACK_SECRET_KEY!,
      }),
      [PaymentGateway.FLUTTERWAVE]: createFlutterWaveAdapter({
        secretKey: process.env.FLW_SECRET_KEY!,
      }),
      [PaymentGateway.INTERSWITCH]: {
        process: async () => {
          throw new Error("Interswitch gateway not implemented yet");
        },
      },
      [PaymentGateway.STRIPE]: {
        process: async () => {
          throw new Error("Stripe gateway not implemented yet");
        },
      },
      [PaymentGateway.PAYPAL]: {
        process: async () => {
          throw new Error("PayPal gateway not implemented yet");
        },
      },
    };
  }
  getAdapter(data: IClassAdapterCred) {
    const { gateway } = data;
    const strategy = this.stategies[gateway];

    if (!strategy) {
      throw new Error("No configurable Payment adapter is available!");
    }

    return strategy;
  }
}

export const createPaymentAdapter = new PaymentAdapter();
