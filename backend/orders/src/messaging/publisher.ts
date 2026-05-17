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

export interface OrderCreatedEvent {
  orderId:    string;
  userId:     string;
  storeId:    string;
  sagaId:     string;
  totalPrice: number;
  cartItems: Array<{ productId: string; quantity: number }>;
}

export interface OrderCompletedEvent {
  orderId:     string;
  userId:      string;
  cartId:      string;
  storeId:     string;
  sagaId:      string;
  receiptUrl?: string;
  completedAt: string;
}

export interface OrderFailedEvent {
  orderId:  string;
  userId:   string;
  storeId:  string;
  sagaId:   string;
  reason:   string;
  failedAt: string;
}

export interface OrderAbandonedEvent {
  orderId:     string;
  userId:      string;
  storeId:     string;
  sagaId:      string;
  cartItems:   Array<{ productId: string; quantity: number }>;
  abandonedAt: string;
  reason:      string;
}

export interface CartItemOutOfStockEvent {
  cartId:           string;
  userId:           string;
  orderId:          string;
  unavailableItems: Array<{ productId: string; productTitle: string; reason: string }>;
  sagaId:           string;
  failedAt:         string;
}

export function publishOrderCreated(event: OrderCreatedEvent): void {
  publish(
    EXCHANGES.ORDERS,
    ROUTING_KEYS.ORDER_CREATED,
    event,
    event.sagaId
  );
}

export function publishOrderCompleted(event: OrderCompletedEvent): void {
  publish(
    EXCHANGES.ORDERS,
    ROUTING_KEYS.ORDER_COMPLETED,
    event,
    event.sagaId
  );
}

export function publishOrderFailed(event: OrderFailedEvent): void {
  publish(
    EXCHANGES.ORDERS,
    ROUTING_KEYS.ORDER_FAILED,
    event,
    event.sagaId
  );
}

export function publishOrderAbandoned(event: OrderAbandonedEvent): void {
  publish(
    EXCHANGES.ORDERS,
    ROUTING_KEYS.ORDER_ABANDONED,
    event,
    event.sagaId
  );
}

export function publishCartItemOutOfStock(
  event: CartItemOutOfStockEvent
): void {
  publish(
    EXCHANGES.CART,
    ROUTING_KEYS.CART_ITEM_OUT_OF_STOCK,
    event,
    event.sagaId
  );
}