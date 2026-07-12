import type { Channel, ConsumeMessage } from "amqplib";
import { SERVICE_NAME } from "../../constants";
import logger from "../../utils/logger";
import { customerService } from "../../domains/customer/customer.service";

interface PaymentCompletedEvent {
  orderId:       string;
  transactionId: string;
  sagaId:        string;
  amount:        number;
  storeId:       string;
  paymentDate:   string;
  customerEmail: string;
  customerName:  string;
  storeName?:    string;
}

function isPaymentCompletedEvent(data: unknown): data is PaymentCompletedEvent {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d["storeId"] === "string" &&
    typeof d["customerEmail"] === "string" &&
    typeof d["customerName"] === "string" &&
    typeof d["amount"] === "number"
  );
}

async function handlePaymentCompleted(
  data: unknown,
  channel: Channel,
  msg: ConsumeMessage
): Promise<void> {
  if (!isPaymentCompletedEvent(data)) {
    logger.error("customer_handler_malformed_payment_event", {
      event:   "customer_handler_malformed_payment_event",
      service: SERVICE_NAME,
      data,
    });
    channel.nack(msg, false, false);
    return;
  }

  await customerService.upsertOnPayment({
    storeId:     data.storeId,
    email:       data.customerEmail,
    name:        data.customerName,
    amount:      data.amount,
    purchasedAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
  });

  channel.ack(msg);
}

export const customerHandlers: Record<
  string,
  (data: unknown, channel: Channel, msg: ConsumeMessage) => Promise<void>
> = {
  "payment.completed": handlePaymentCompleted,
};