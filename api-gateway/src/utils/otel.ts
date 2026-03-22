
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

const TEMPO_URL = process.env.TEMPO_URL ?? "http://tempo:4318/v1/traces";
const OTEL_ENABLED = process.env.OTEL_ENABLED !== "false";

if (process.env.NODE_ENV !== "production") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
}

const instrumentations = [
  getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": { enabled: false },
  }),
  new WinstonInstrumentation({
    logHook: (span, record) => {
      record["trace_id"] = span.spanContext().traceId;
      record["trace_flags"] = `0${span.spanContext().traceFlags.toString(16)}`;
      record["span_id"] = span.spanContext().spanId;
    },
  }),
];

let sdk: NodeSDK;

if (OTEL_ENABLED) {
  const traceExporter = new OTLPTraceExporter({
    url: TEMPO_URL,
    timeoutMillis: 5000,
  });

  sdk = new NodeSDK({
    traceExporter,
    instrumentations,
  });
} else {
  sdk = new NodeSDK({ instrumentations });
}

sdk.start();

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error) => console.error("Error terminating tracing", error))
    .finally(() => process.exit(0));
});

export default sdk;