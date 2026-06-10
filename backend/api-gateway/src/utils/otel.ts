import { NodeSDK }                        from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations }    from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter }              from "@opentelemetry/exporter-trace-otlp-http";
import { B3Propagator }                   from "@opentelemetry/propagator-b3";
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import logger from "./logger";
import { SERVICE_NAME } from "../constants";

const OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://tempo:4318";

const exporter = new OTLPTraceExporter({
  url: `${OTLP_ENDPOINT}/v1/traces`,
});

const sdk = new NodeSDK({
  serviceName: SERVICE_NAME,
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),
  traceExporter:    exporter,
  textMapPropagator: new B3Propagator(),
  instrumentations: [getNodeAutoInstrumentations()],
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