import { PaymentGateway }          from "../domains/payment/payment.model";
import createPaystackAdapter       from "./paystack.adapter";
import createFlutterwaveAdapter    from "./flutterwave.adapter";

export interface IAdapterRequest {
  secretKey: string;
}

export interface IPaymentProcessRequest {
  amount:      number;
  callbackUrl: string;
  currency:    string;
  email:       string;
  phone:       string;
  userId:      string;
  name:        string;
}

export interface IPaymentRefundRequest {
  transactionId: string;
  amount:        number;
  reason?:       string;
}

export interface IPaymentResponse {
  success:        boolean;
  message:        string;
  transactionId?: string;
  redirectUrl?:   string;
}

export interface IAdapterResponse {
  process:                (req: IPaymentProcessRequest) => Promise<IPaymentResponse>;
  refund?:                (req: IPaymentRefundRequest)  => Promise<IPaymentResponse>;
  verifyWebhook?:         (payload: unknown, signature?: string) => boolean;
  extractTransactionId?:  (payload: unknown) => string;
  extractStatus?:         (payload: unknown) => "success" | "failed" | "pending";
  extractAmount?:         (payload: unknown) => number;
  extractMetadata?:       (payload: unknown) => Record<string, unknown>;
}

class PaymentStrategies {
  private strategies: Record<PaymentGateway, IAdapterResponse>;

  constructor() {
    this.strategies = {
      [PaymentGateway.PAYSTACK]: createPaystackAdapter({
        secretKey: process.env.PAYSTACK_SECRET_KEY!,
      }),
      [PaymentGateway.FLUTTERWAVE]: createFlutterwaveAdapter({
        secretKey: process.env.FLW_SECRET_KEY!,
      }),
      [PaymentGateway.INTERSWITCH]: {
        process: async () => {
          throw new Error("Interswitch gateway not implemented yet.");
        },
      },
      [PaymentGateway.STRIPE]: {
        process: async () => {
          throw new Error("Stripe gateway not implemented yet.");
        },
      },
      [PaymentGateway.PAYPAL]: {
        process: async () => {
          throw new Error("PayPal gateway not implemented yet.");
        },
      },
    };
  }

  getAdapter(data: { gateway: PaymentGateway }): IAdapterResponse {
    const strategy = this.strategies[data.gateway];
    if (!strategy) throw new Error("No payment adapter available.");
    return strategy;
  }
}

export const createPaymentAdapter = new PaymentStrategies();