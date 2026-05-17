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

export interface StoreCreatedEvent {
  storeId:        string;
  organizationId: string;
  ownerId:        string;
  subdomain:      string;
}

export interface NotificationStoreOnboardingEvent {
  email:          string;
  name:           string;
  store:          string;
  storeUrl:       string;
  notificationId: string;
}

export function publishStoreCreated(event: StoreCreatedEvent): void {
  publish(
    EXCHANGES.STORES,
    ROUTING_KEYS.STORE_CREATED,
    event,
    event.storeId
  );
}

export function publishNotificationStoreOnboarding(
  event: NotificationStoreOnboardingEvent
): void {
  publish(
    EXCHANGES.NOTIFICATION,
    ROUTING_KEYS.NOTIFICATION_STORE_ONBOARDING,
    event,
    event.notificationId
  );
}