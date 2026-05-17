import winston, { format } from "winston";
import { randomUUID } from "crypto";
import { requestContext } from "../context/requestContext";

const base = winston.createLogger({
  level:       process.env.LOG_LEVEL ?? "info",
  format:      format.combine(format.timestamp(), format.json()),
  defaultMeta: {
    service: process.env.OTEL_SERVICE_NAME ?? "organization-service",
  },
  transports: [new winston.transports.Console()],
});

export interface LogMeta {
  event?:          string;
  service?:        string;
  userId?:         string;
  organizationId?: string;
  storeId?:        string;
  requestId?:      string;
  traceId?:        string;
  spanId?:         string;
  eventType?:      string;
  [key: string]:   unknown;
}

function enrich(meta: LogMeta = {}): LogMeta {
  const ctx = requestContext.get();
  return {
    requestId:      ctx?.requestId ?? randomUUID(),
    traceId:        ctx?.traceId,
    spanId:         ctx?.spanId,
    userId:         ctx?.userId,
    organizationId: ctx?.organizationId,
    storeId:        ctx?.storeId,
    eventType:      ctx?.eventType,
    ...meta,
  };
}

const logger = {
  info:  (msg: string, meta?: LogMeta) => base.info(msg, enrich(meta)),
  warn:  (msg: string, meta?: LogMeta) => base.warn(msg, enrich(meta)),
  error: (msg: string, meta?: LogMeta) => base.error(msg, enrich(meta)),
  debug: (msg: string, meta?: LogMeta) => base.debug(msg, enrich(meta)),
};

export default logger;