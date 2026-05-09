import { context, propagation } from "@opentelemetry/api";
import { getRabbitMQChannel } from "./connection";

export interface PublishOptions {
  exchange: string;
  routingKey: string;
  payload: unknown;
  requestId?: string;
  serviceName: string;
  correlationId?: string;
}

export function publishToExchange(options: PublishOptions): void {
  const channel = getRabbitMQChannel();

  const traceHeaders: Record<string, string> = {};
  propagation.inject(context.active(), traceHeaders);

  channel.publish(
    options.exchange,
    options.routingKey,
    Buffer.from(JSON.stringify(options.payload)),
    {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
      appId: options.serviceName,
      headers: {
        "x-request-id": options.requestId ?? "",
        "x-service": options.serviceName,
        "x-correlation-id": options.correlationId ?? "",
        ...traceHeaders,
      },
    }
  );
}