import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

if (process.env.NODE_ENV !== "production") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

const traceExporter = new OTLPTraceExporter({
  url: "http://tempo:4318/v1/traces",
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
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
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error) => console.error("Error terminating tracing", error))
    .finally(() => process.exit(0));
});

export default sdk;