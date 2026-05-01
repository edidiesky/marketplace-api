  import winston, { format } from "winston";
  import { randomUUID } from "crypto";
  import { requestContext } from "../context/requestContext";

  //  base winston instance 
  const baseLogger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: "store_service" },
    transports: [new winston.transports.Console()],
  });

  if (process.env.NODE_ENV !== "production") {
    baseLogger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      })
    );
  }

  //  context enrichment 

  export interface LogMeta {
    storeId?: string;
    userId?: string;
    tenantId?: string;
    eventType?: string;
    traceId?: string;
    spanId?: string;
    requestId?: string;
    [key: string]: unknown;
  }

  function enrich(meta: LogMeta = {}): LogMeta {
    const ctx = requestContext.get();
    return {
      requestId: ctx?.requestId ?? randomUUID(),
      traceId: ctx?.traceId,
      spanId: ctx?.spanId,
      storeId: ctx?.storeId,
      userId: ctx?.userId,
      tenantId: ctx?.tenantId,
      eventType: ctx?.eventType,
      ...meta,
    };
  }

  //  public interface 

  export interface IContextLogger {
    info(message: string, meta?: LogMeta): void;
    warn(message: string, meta?: LogMeta): void;
    error(message: string, meta?: LogMeta): void;
    debug(message: string, meta?: LogMeta): void;
  }

  class ContextLogger implements IContextLogger {
    info(message: string, meta?: LogMeta): void {
      baseLogger.info(message, enrich(meta));
    }

    warn(message: string, meta?: LogMeta): void {
      baseLogger.warn(message, enrich(meta));
    }

    error(message: string, meta?: LogMeta): void {
      baseLogger.error(message, enrich(meta));
    }

    debug(message: string, meta?: LogMeta): void {
      baseLogger.debug(message, enrich(meta));
    }
  }

  const logger = new ContextLogger();
  export default logger;