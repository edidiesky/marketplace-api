import type { ConsumeMessage } from "amqplib";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { getRabbitMQChannel } from "./connection";
import { QUEUES, ROUTING_KEYS, SERVICE_NAME } from "../constants";
import { authenticationHandlers } from "./handlers/authentication.handlers";
import { requestContext } from "../context/requestContext";
import logger from "../utils/logger";
import { randomUUID } from "crypto";

const tracer = trace.getTracer(SERVICE_NAME);

const queueHandlerMap: Record<string, string> = {
  [QUEUES.USER_ONBOARDING]: ROUTING_KEYS.ORGANIZATION_ONBOARDING_COMPLETED,
  [QUEUES.USER_ROLLBACK]:   ROUTING_KEYS.ORGANIZATION_ONBOARDING_FAILED,
};

export async function connectAuthConsumer(): Promise<void> {
  const channel = getRabbitMQChannel();
  channel.prefetch(10);

  for (const [queue, routingKey] of Object.entries(queueHandlerMap)) {
    const handler = authenticationHandlers[routingKey];

    if (!handler) {
      logger.warn("auth_consumer_no_handler", {
        event:   "auth_consumer_no_handler",
        service: SERVICE_NAME,
        queue,
        routingKey,
      });
      continue;
    }

    await channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const rawHeaders = msg.properties.headers ?? {};
        const normalizedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(rawHeaders)) {
          if (value !== undefined && value !== null) {
            normalizedHeaders[key] = Buffer.isBuffer(value)
              ? value.toString("utf8")
              : String(value);
          }
        }

        const parentContext = propagation.extract(
          context.active(),
          normalizedHeaders
        );
        const requestId =
          normalizedHeaders["x-request-id"] ?? randomUUID();

        let data: unknown;
        try {
          data = JSON.parse(msg.content.toString());
        } catch (err) {
          logger.error("auth_consumer_parse_error", {
            event:   "auth_consumer_parse_error",
            service: SERVICE_NAME,
            queue,
            error:   err instanceof Error ? err.message : String(err),
          });
          channel.nack(msg, false, false);
          return;
        }

        await context.with(parentContext, async () => {
          const span = tracer.startSpan(`rabbitmq.consume.${queue}`, {
            kind: SpanKind.CONSUMER,
            attributes: {
              "messaging.system":               "rabbitmq",
              "messaging.destination":          queue,
              "messaging.operation":            "receive",
              "messaging.rabbitmq.routing_key": msg.fields.routingKey,
            },
          });

          await context.with(
            trace.setSpan(context.active(), span),
            async () => {
              const spanCtx = span.spanContext();
              requestContext.run(
                {
                  requestId,
                  traceId:   spanCtx.traceId,
                  spanId:    spanCtx.spanId,
                  eventType: msg.fields.routingKey,
                },
                async () => {
                  try {
                    await handler(data, channel, msg);
                    span.setStatus({ code: SpanStatusCode.OK });
                  } catch (err) {
                    span.recordException(err as Error);
                    span.setStatus({
                      code:    SpanStatusCode.ERROR,
                      message: err instanceof Error
                        ? err.message
                        : String(err),
                    });
                    logger.error("auth_consumer_handler_error", {
                      event:      "auth_consumer_handler_error",
                      service:    SERVICE_NAME,
                      queue,
                      routingKey: msg.fields.routingKey,
                      requestId,
                      error:      err instanceof Error
                        ? err.message
                        : String(err),
                    });
                    channel.nack(msg, false, false);
                  } finally {
                    span.end();
                  }
                }
              );
            }
          );
        });
      },
      { noAck: false }
    );

    logger.info("auth_consumer_started", {
      event:      "auth_consumer_started",
      service:    SERVICE_NAME,
      queue,
      routingKey,
    });
  }
}

export async function disconnectAuthConsumer(): Promise<void> {
  logger.info("auth_consumer_disconnected", {
    event:   "auth_consumer_disconnected",
    service: SERVICE_NAME,
  });
}