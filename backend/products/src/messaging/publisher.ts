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

export function publishProductCreated(
  payload: Record<string, unknown>
): void {
  publish(
    EXCHANGES.PRODUCTS,
    ROUTING_KEYS.PRODUCT_CREATED,
    payload,
    payload["productId"] as string
  );
}

export function publishProductUpdated(
  payload: Record<string, unknown>
): void {
  publish(
    EXCHANGES.PRODUCTS,
    ROUTING_KEYS.PRODUCT_UPDATED,
    payload,
    payload["productId"] as string
  );
}

export function publishProductDeleted(
  payload: Record<string, unknown>
): void {
  publish(
    EXCHANGES.PRODUCTS,
    ROUTING_KEYS.PRODUCT_DELETED,
    payload,
    payload["productId"] as string
  );
}