import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
const exporter = new OTLPTraceExporter({
  url: "http://tempo:4318/v1/traces",
});

import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import logger from "./utils/logger";

const sdk = new NodeSDK({
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),
  traceExporter: exporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().then(
    () => logger.info("Tracing terminated"),
    () => logger.info("Error shutting down tracing")
  );
});
