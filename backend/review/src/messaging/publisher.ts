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
        "x-request-id": requestContext.get()?.requestId ?? "",
        "x-service":    SERVICE_NAME,
        "x-correlation-id": correlationId ?? "",
        ...traceHeaders,
      },
    }
  );
}

export interface ReviewCreatedEvent {
  reviewId:  string;
  productId: string;
  storeId:   string;
  userId:    string;
  rating:    number;
  verified:  boolean;
}

export interface ReviewApprovedEvent {
  reviewId:  string;
  productId: string;
  storeId:   string;
  rating:    number;
}

export function publishReviewCreated(event: ReviewCreatedEvent): void {
  publish(
    EXCHANGES.REVIEW,
    ROUTING_KEYS.REVIEW_CREATED,
    event,
    event.reviewId
  );
}

export function publishReviewApproved(event: ReviewApprovedEvent): void {
  publish(
    EXCHANGES.REVIEW,
    ROUTING_KEYS.REVIEW_APPROVED,
    event,
    event.reviewId
  );
}