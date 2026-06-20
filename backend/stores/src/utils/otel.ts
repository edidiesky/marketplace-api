import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { W3CTraceContextPropagator, CompositePropagator } from "@opentelemetry/core";
import { B3Propagator, B3InjectEncoding } from "@opentelemetry/propagator-b3";
import logger from "./logger";

const TEMPO_URL    = process.env.TEMPO_URL ?? "http://tempo:4318/v1/traces";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "stores-service";
const ENABLED      = process.env.OTEL_ENABLED !== "false";

if (process.env.NODE_ENV !== "production") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
}

const sdk = new NodeSDK({
  serviceName: SERVICE_NAME,
  ...(ENABLED && {
    traceExporter: new OTLPTraceExporter({
      url:           TEMPO_URL,
      timeoutMillis: 5000,
    }),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
    new WinstonInstrumentation({
      logHook: (span, record) => {
        record["trace_id"]    = span.spanContext().traceId;
        record["span_id"]     = span.spanContext().spanId;
        record["trace_flags"] = `0${span.spanContext().traceFlags.toString(16)}`;
      },
    }),
  ],
  textMapPropagator: new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
    ],
  }),
});

sdk.start();

async function shutdown(signal: string): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
    logger.info("otel_tracing_terminated", {
      event:   "otel_tracing_terminated",
      service: SERVICE_NAME,
      signal,
    });
  } catch (err) {
    logger.error("otel_tracing_shutdown_error", {
      event:   "otel_tracing_shutdown_error",
      service: SERVICE_NAME,
      signal,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}
 
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

export default sdk;