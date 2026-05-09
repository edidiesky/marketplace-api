import type { Channel, ConsumeMessage } from "amqplib";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { getRabbitMQChannel } from "./connection";
import { requestContext } from "../context/requestContext";
import { randomUUID } from "crypto";

export type MessageHandler = (
  data: unknown,
  channel: Channel,
  msg: ConsumeMessage
) => Promise<void>;

export interface ConsumeOptions {
  queue: string;
  serviceName: string;
  prefetch?: number;
  handler: MessageHandler;
}

export async function consumeQueue(options: ConsumeOptions): Promise<void> {
  const channel = getRabbitMQChannel();
  const tracer = trace.getTracer(options.serviceName);

  channel.prefetch(options.prefetch ?? 10);

  await channel.consume(
    options.queue,
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
      const correlationId = normalizedHeaders["x-correlation-id"] ?? "";

      let data: unknown;

      try {
        data = JSON.parse(msg.content.toString());
      } catch (err) {
        console.error("rabbitmq_consumer_parse_error", {
          event: "rabbitmq_consumer_parse_error",
          service: options.serviceName,
          queue: options.queue,
          error: err instanceof Error ? err.message : String(err),
          requestId,
        });
        channel.nack(msg, false, false);
        return;
      }

      await context.with(parentContext, async () => {
        const span = tracer.startSpan(
          `rabbitmq.consume.${options.queue}`,
          {
            kind: SpanKind.CONSUMER,
            attributes: {
              "messaging.system": "rabbitmq",
              "messaging.destination": options.queue,
              "messaging.operation": "receive",
              "messaging.rabbitmq.routing_key":
                msg.fields.routingKey,
            },
          }
        );

        await context.with(
          trace.setSpan(context.active(), span),
          async () => {
            const spanContext = span.spanContext();

            requestContext.run(
              {
                requestId,
                traceId: spanContext.traceId,
                spanId: spanContext.spanId,
                eventType: msg.fields.routingKey,
              },
              async () => {
                try {
                  await options.handler(data, channel, msg);
                  span.setStatus({ code: SpanStatusCode.OK });
                } catch (err) {
                  span.recordException(err as Error);
                  span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message:
                      err instanceof Error ? err.message : String(err),
                  });

                  console.error("rabbitmq_consumer_handler_error", {
                    event: "rabbitmq_consumer_handler_error",
                    service: options.serviceName,
                    queue: options.queue,
                    routingKey: msg.fields.routingKey,
                    requestId,
                    correlationId,
                    error:
                      err instanceof Error ? err.message : String(err),
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
}