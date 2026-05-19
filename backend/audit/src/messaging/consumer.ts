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
import { auditHandlers }      from "./handlers/audit.handlers";
import { requestContext }     from "../context/requestContext";
import logger                 from "../utils/logger";
import { randomUUID }         from "crypto";

const tracer = trace.getTracer(SERVICE_NAME);

const queueHandlerMap: Record<string, string> = {
  [QUEUES.USER_REGISTERED]:           ROUTING_KEYS.USER_REGISTERED,
  [QUEUES.USER_LOGIN]:                ROUTING_KEYS.USER_LOGIN,
  [QUEUES.USER_LOGOUT]:               ROUTING_KEYS.USER_LOGOUT,
  [QUEUES.USER_PASSWORD_RESET]:       ROUTING_KEYS.USER_PASSWORD_RESET,
  [QUEUES.ORGANIZATION_CREATED]:      ROUTING_KEYS.ORGANIZATION_CREATED,
  [QUEUES.ORGANIZATION_UPDATED]:      ROUTING_KEYS.ORGANIZATION_UPDATED,
  [QUEUES.STORE_CREATED]:             ROUTING_KEYS.STORE_CREATED,
  [QUEUES.STORE_UPDATED]:             ROUTING_KEYS.STORE_UPDATED,
  [QUEUES.STORE_STATUS_CHANGED]:      ROUTING_KEYS.STORE_STATUS_CHANGED,
  [QUEUES.ORDER_CREATED]:             ROUTING_KEYS.ORDER_CREATED,
  [QUEUES.ORDER_COMPLETED]:           ROUTING_KEYS.ORDER_COMPLETED,
  [QUEUES.ORDER_FAILED]:              ROUTING_KEYS.ORDER_FAILED,
  [QUEUES.ORDER_ABANDONED]:           ROUTING_KEYS.ORDER_ABANDONED,
  [QUEUES.PAYMENT_COMPLETED]:         ROUTING_KEYS.PAYMENT_COMPLETED,
  [QUEUES.PAYMENT_FAILED]:            ROUTING_KEYS.PAYMENT_FAILED,
  [QUEUES.PAYMENT_REFUNDED]:          ROUTING_KEYS.PAYMENT_REFUNDED,
  [QUEUES.INVENTORY_RESERVATION_FAILED]: ROUTING_KEYS.INVENTORY_RESERVATION_FAILED,
  [QUEUES.REVIEW_CREATED]:            ROUTING_KEYS.REVIEW_CREATED,
  [QUEUES.REVIEW_APPROVED]:           ROUTING_KEYS.REVIEW_APPROVED,
  [QUEUES.REVIEW_REJECTED]:           ROUTING_KEYS.REVIEW_REJECTED,
};

export async function connectAuditConsumer(): Promise<void> {
  const channel = getRabbitMQChannel();
  channel.prefetch(20);

  for (const [queue, routingKey] of Object.entries(queueHandlerMap)) {
    const handler = auditHandlers[routingKey];

    if (!handler) {
      logger.warn("audit_consumer_no_handler", {
        event:      "audit_consumer_no_handler",
        service:    SERVICE_NAME,
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
          logger.error("audit_consumer_parse_error", {
            event:   "audit_consumer_parse_error",
            service: SERVICE_NAME,
            queue,
            error:   err instanceof Error ? err.message : String(err),
          });
          channel.nack(msg, false, false);
          return;
        }

        await context.with(parentContext, async () => {
          const span = tracer.startSpan(
            `rabbitmq.consume.${queue}`,
            {
              kind: SpanKind.CONSUMER,
              attributes: {
                "messaging.system":               "rabbitmq",
                "messaging.destination":          queue,
                "messaging.operation":            "receive",
                "messaging.rabbitmq.routing_key": msg.fields.routingKey,
              },
            }
          );

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
                      message: err instanceof Error ? err.message : String(err),
                    });
                    logger.error("audit_consumer_handler_error", {
                      event:      "audit_consumer_handler_error",
                      service:    SERVICE_NAME,
                      queue,
                      routingKey: msg.fields.routingKey,
                      requestId,
                      error:      err instanceof Error ? err.message : String(err),
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

    logger.info("audit_consumer_started", {
      event:      "audit_consumer_started",
      service:    SERVICE_NAME,
      queue,
      routingKey,
    });
  }
}