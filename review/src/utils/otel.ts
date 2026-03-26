
// import { NodeSDK } from "@opentelemetry/sdk-node";
// import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
// import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
// import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// const TEMPO_URL = process.env.TEMPO_URL ?? "http://tempo:4318/v1/traces";
// const OTEL_ENABLED = process.env.OTEL_ENABLED !== "false";

// if (process.env.NODE_ENV !== "production") {
//   diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
// }

// const instrumentations = [
//   getNodeAutoInstrumentations({
//     "@opentelemetry/instrumentation-fs": { enabled: false },
//   }),
//   new WinstonInstrumentation({
//     logHook: (span, record) => {
//       record["trace_id"] = span.spanContext().traceId;
//       record["trace_flags"] = `0${span.spanContext().traceFlags.toString(16)}`;
//       record["span_id"] = span.spanContext().spanId;
//     },
//   }),
// ];

// let sdk: NodeSDK;

// if (OTEL_ENABLED) {
//   const traceExporter = new OTLPTraceExporter({
//     url: TEMPO_URL,
//     timeoutMillis: 5000,
//   });

//   sdk = new NodeSDK({
//     traceExporter,
//     instrumentations,
//   });
// } else {
//   sdk = new NodeSDK({ instrumentations });
// }

// sdk.start();

// process.on("SIGTERM", () => {
//   sdk
//     .shutdown()
//     .then(() => console.log("Tracing terminated"))
//     .catch((error) => console.error("Error terminating tracing", error))
//     .finally(() => process.exit(0));
// });

// export default sdk;

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import {
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { CompositePropagator } from "@opentelemetry/core";
import { B3Propagator, B3InjectEncoding } from "@opentelemetry/propagator-b3";

const TEMPO_URL = process.env.TEMPO_URL ?? "http://tempo:4318/v1/traces";
const OTEL_ENABLED = process.env.OTEL_ENABLED !== "false";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "review-service";

if (process.env.NODE_ENV !== "production") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
}

const instrumentations = [
  getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-http": {
      enabled: true,
    },
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
    serviceName: SERVICE_NAME,
    traceExporter,
    instrumentations,
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
      ],
    }),
  });
} else {
  sdk = new NodeSDK({
    serviceName: SERVICE_NAME,
    instrumentations,
    textMapPropagator: new W3CTraceContextPropagator(),
  });
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