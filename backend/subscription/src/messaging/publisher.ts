import { context, propagation } from "@opentelemetry/api";
import { getRabbitMQChannel }   from "./connection";
import { EXCHANGES, ROUTING_KEYS, SERVICE_NAME } from "../constants";
import { requestContext }       from "../context/requestContext";
import { BillingPlan, IPlanFeatures, SubscriptionStatus } from "../domains/subscription/subscription.model";

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

export interface SubscriptionCreatedEvent {
  subscriptionId: string;
  organizationId: string;
  ownerId:        string;
  plan:           BillingPlan;
  status:         SubscriptionStatus;
  trialEndsAt:    string;
  features:       IPlanFeatures;
}

export interface SubscriptionUpgradedEvent {
  subscriptionId: string;
  organizationId: string;
  ownerId:        string;
  previousPlan:   BillingPlan;
  newPlan:        BillingPlan;
  features:       IPlanFeatures;
  upgradedAt:     string;
}

export function publishSubscriptionCreated(
  event: SubscriptionCreatedEvent
): void {
  publish(
    EXCHANGES.SUBSCRIPTION,
    ROUTING_KEYS.SUBSCRIPTION_CREATED,
    event,
    event.organizationId
  );
}

export function publishSubscriptionUpgraded(
  event: SubscriptionUpgradedEvent
): void {
  publish(
    EXCHANGES.SUBSCRIPTION,
    ROUTING_KEYS.SUBSCRIPTION_UPGRADED,
    event,
    event.organizationId
  );
}