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

export interface InventoryReservedEvent {
  productId:          string;
  storeId:            string;
  quantity:           number;
  sagaId:             string;
  userId:             string;
  remainingAvailable: number;
}

export interface InventoryReleasedEvent {
  productId: string;
  storeId:   string;
  quantity:  number;
  sagaId:    string;
  userId:    string;
}

export interface InventoryCommittedEvent {
  productId: string;
  storeId:   string;
  quantity:  number;
  sagaId:    string;
  userId:    string;
}

export interface InventoryLowEvent {
  productId:         string;
  storeId:           string;
  quantityAvailable: number;
  reorderPoint:      number;
}

export function publishInventoryReserved(
  event: InventoryReservedEvent
): void {
  publish(
    EXCHANGES.INVENTORY,
    ROUTING_KEYS.INVENTORY_RESERVED,
    event,
    event.sagaId
  );
}

export function publishInventoryReleased(
  event: InventoryReleasedEvent
): void {
  publish(
    EXCHANGES.INVENTORY,
    ROUTING_KEYS.INVENTORY_RELEASED,
    event,
    event.sagaId
  );
}

export function publishInventoryCommitted(
  event: InventoryCommittedEvent
): void {
  publish(
    EXCHANGES.INVENTORY,
    ROUTING_KEYS.INVENTORY_COMMITTED,
    event,
    event.sagaId
  );
}

export function publishInventoryLow(event: InventoryLowEvent): void {
  publish(
    EXCHANGES.INVENTORY,
    ROUTING_KEYS.INVENTORY_LOW,
    event,
    event.productId
  );
}