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

export interface OrganizationOnboardingCompletedEvent {
  organizationId:   string;
  ownerId:          string;
  ownerEmail:       string;
  ownerName:        string;
  organizationType: string;
  billingPlan:      string;
  trialEndsAt:      string;
}

export interface OrganizationOnboardingFailedEvent {
  ownerId: string;
  email:   string;
  reason:  string;
}

export interface NotificationOrgOnboardingEvent {
  organizationId: string;
  email:          string;
  ownerName:      string;
  plan:           string;
  notificationId: string;
}

export function publishOrganizationOnboardingCompleted(
  event: OrganizationOnboardingCompletedEvent
): void {
  publish(
    EXCHANGES.ORGANIZATION,
    ROUTING_KEYS.ORGANIZATION_ONBOARDING_COMPLETED,
    event,
    event.organizationId
  );
}

export function publishOrganizationOnboardingFailed(
  event: OrganizationOnboardingFailedEvent
): void {
  publish(
    EXCHANGES.ORGANIZATION,
    ROUTING_KEYS.ORGANIZATION_ONBOARDING_FAILED,
    event,
    event.ownerId
  );
}

export function publishNotificationOrgOnboarding(
  event: NotificationOrgOnboardingEvent
): void {
  publish(
    EXCHANGES.NOTIFICATION,
    ROUTING_KEYS.NOTIFICATION_ORG_ONBOARDING,
    event,
    event.notificationId
  );
}