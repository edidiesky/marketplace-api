import { context, propagation } from "@opentelemetry/api";
import { getRabbitMQChannel }   from "./connection";
import { EXCHANGES, ROUTING_KEYS, SERVICE_NAME } from "../constants";
import { requestContext }       from "../context/requestContext";

function publish(
  exchange:       string,
  routingKey:     string,
  payload:        unknown,
  correlationId?: string
): void {
  const channel      = getRabbitMQChannel();
  const traceHeaders: Record<string, string> = {};
  propagation.inject(context.active(), traceHeaders);

  channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent:  true,
      contentType: "application/json",
      timestamp:   Date.now(),
      appId:       SERVICE_NAME,
      headers: {
        "x-request-id":     requestContext.get()?.requestId ?? "",
        "x-service":        SERVICE_NAME,
        "x-correlation-id": correlationId ?? "",
        ...traceHeaders,
      },
    }
  );
}

export interface PaymentCompletedEvent {
  orderId:       string;
  transactionId: string;
  sagaId:        string;
  amount:        number;
  storeId:       string;
  paymentDate:   string;
}

export interface PaymentFailedEvent {
  orderId:  string;
  sagaId:   string;
  storeId:  string;
  reason:   string;
  failedAt: string;
}

export interface PaymentInitiatedEvent {
  orderId:       string;
  transactionId: string;
  sagaId:        string;
}

export interface PaymentRefundedEvent {
  orderId:           string;
  sagaId:            string;
  originalPaymentId: string;
  refundAmount:      number;
  reason:            string;
}

export function publishPaymentCompleted(
  payload: Record<string, unknown>
): void {
  publish(
    EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_COMPLETED,
    payload,
    payload["sagaId"] as string
  );
}

export function publishPaymentFailed(
  payload: Record<string, unknown>
): void {
  publish(
    EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_FAILED,
    payload,
    payload["sagaId"] as string
  );
}

export function publishPaymentInitiated(
  payload: Record<string, unknown>
): void {
  publish(
    EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_INITIATED,
    payload,
    payload["sagaId"] as string
  );
}

export function publishPaymentRefunded(event: PaymentRefundedEvent): void {
  publish(
    EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_REFUNDED,
    event,
    event.sagaId
  );
}