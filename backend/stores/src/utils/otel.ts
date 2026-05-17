import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { W3CTraceContextPropagator, CompositePropagator } from "@opentelemetry/core";
import { B3Propagator, B3InjectEncoding } from "@opentelemetry/propagator-b3";

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

process.on("SIGTERM", () => {
  sdk.shutdown().finally(() => process.exit(0));
});

export default sdk;