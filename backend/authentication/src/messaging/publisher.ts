import { context, propagation } from "@opentelemetry/api";
import { getRabbitMQChannel } from "./connection";
import { EXCHANGES, ROUTING_KEYS, SERVICE_NAME } from "../constants";
import { requestContext } from "../context/requestContext";

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
      persistent:   true,
      contentType:  "application/json",
      timestamp:    Date.now(),
      appId:        SERVICE_NAME,
      headers: {
        "x-request-id":     requestContext.get()?.requestId ?? "",
        "x-service":        SERVICE_NAME,
        "x-correlation-id": correlationId ?? "",
        ...traceHeaders,
      },
    }
  );
}

export interface UserOnboardingCompletedEvent {
  userId:           string;
  organizationId:   string;
  organizationType: string;
  email:            string;
  ownerName:        string;
  billingPlan:      string;
}

export interface NotificationEmailConfirmationEvent {
  email:           string;
  firstName:       string;
  lastName:        string;
  notificationId:  string;
  verificationUrl: string;
}

export interface Notification2FAEvent {
  email:          string;
  fullName:       string;
  token:          string;
  phone?:         string;
  notificationId: string;
}

export interface NotificationResetPasswordEvent {
  email:           string;
  firstName:       string;
  lastName:        string;
  notificationId:  string;
  verificationUrl: string;
}

export function publishUserOnboardingCompleted(
  event: UserOnboardingCompletedEvent
): void {
  publish(
    EXCHANGES.AUTHENTICATION,
    ROUTING_KEYS.USER_ONBOARDING_COMPLETED,
    event,
    event.userId
  );
}

export function publishNotificationEmailConfirmation(
  event: NotificationEmailConfirmationEvent
): void {
  publish(
    EXCHANGES.NOTIFICATION,
    ROUTING_KEYS.NOTIFICATION_EMAIL_CONFIRMATION,
    event,
    event.notificationId
  );
}

export function publishNotification2FA(event: Notification2FAEvent): void {
  publish(
    EXCHANGES.NOTIFICATION,
    ROUTING_KEYS.NOTIFICATION_2FA,
    event,
    event.notificationId
  );
}

export function publishNotificationResetPassword(
  event: NotificationResetPasswordEvent
): void {
  publish(
    EXCHANGES.NOTIFICATION,
    ROUTING_KEYS.NOTIFICATION_RESET_PASSWORD,
    event,
    event.notificationId
  );
}