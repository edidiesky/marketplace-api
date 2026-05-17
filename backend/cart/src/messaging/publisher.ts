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

export interface CartItemAddedEvent {
  cartId:    string;
  userId:    string;
  storeId:   string;
  productId: string;
  quantity:  number;
}

export interface CartItemRemovedEvent {
  cartId:    string;
  userId:    string;
  storeId:   string;
  productId: string;
}

export interface CartClearedEvent {
  cartId:  string;
  userId:  string;
  storeId: string;
  orderId: string;
}

export function publishCartItemAdded(event: CartItemAddedEvent): void {
  publish(
    EXCHANGES.CART,
    ROUTING_KEYS.CART_ITEM_ADDED,
    event,
    event.cartId
  );
}

export function publishCartItemRemoved(event: CartItemRemovedEvent): void {
  publish(
    EXCHANGES.CART,
    ROUTING_KEYS.CART_ITEM_REMOVED,
    event,
    event.cartId
  );
}

export function publishCartCleared(event: CartClearedEvent): void {
  publish(
    EXCHANGES.CART,
    ROUTING_KEYS.CART_CLEARED,
    event,
    event.cartId
  );
}