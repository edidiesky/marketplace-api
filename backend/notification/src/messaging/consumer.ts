import type { ConsumeMessage } from "amqplib";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { getRabbitMQChannel }        from "./connection";
import { QUEUES, SERVICE_NAME } from "../constants";
import { requestContext }            from "../context/requestContext";
import logger                        from "../utils/logger";
import { randomUUID }                from "crypto";
import { BaseNotificationHandler }   from "./handlers/base.handler";
import { emailConfirmationHandler }  from "./handlers/email-confirmation.handler";
import { twoFAHandler }              from "./handlers/twofa.handler";
import { passwordResetHandler }      from "./handlers/password-reset.handler";
import { orgOnboardingHandler }      from "./handlers/org-onboarding.handler";
import { storeOnboardingHandler }    from "./handlers/store-onboarding.handler";
import { paymentSuccessHandler }     from "./handlers/payment-success.handler";
import { paymentFailedHandler }      from "./handlers/payment-failed.handler";
import { orderCompletedHandler }     from "./handlers/order-completed.handler";
import { lowStockHandler }           from "./handlers/low-stock.handler";

const tracer = trace.getTracer(SERVICE_NAME);

const queueHandlerMap: Record<string, BaseNotificationHandler> = {
  [QUEUES.EMAIL_CONFIRMATION]: emailConfirmationHandler,
  [QUEUES.TWO_FA]:             twoFAHandler,
  [QUEUES.RESET_PASSWORD]:     passwordResetHandler,
  [QUEUES.ORG_ONBOARDING]:     orgOnboardingHandler,
  [QUEUES.STORE_ONBOARDING]:   storeOnboardingHandler,
  [QUEUES.PAYMENT_SUCCESS]:    paymentSuccessHandler,
  [QUEUES.PAYMENT_FAILED]:     paymentFailedHandler,
  [QUEUES.ORDER_COMPLETED]:    orderCompletedHandler,
  [QUEUES.LOW_STOCK]:          lowStockHandler,
};

export async function connectNotificationConsumer(): Promise<void> {
  const channel = getRabbitMQChannel();
  channel.prefetch(10);

  for (const [queue, handler] of Object.entries(queueHandlerMap)) {
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
          logger.error("notification_consumer_parse_error", {
            event:   "notification_consumer_parse_error",
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
                    await handler.process(data, channel, msg);
                    span.setStatus({ code: SpanStatusCode.OK });
                  } catch (err) {
                    span.recordException(err as Error);
                    span.setStatus({
                      code:    SpanStatusCode.ERROR,
                      message: err instanceof Error ? err.message : String(err),
                    });
                    logger.error("notification_consumer_handler_error", {
                      event:      "notification_consumer_handler_error",
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

    logger.info("notification_consumer_started", {
      event:   "notification_consumer_started",
      service: SERVICE_NAME,
      queue,
    });
  }
}