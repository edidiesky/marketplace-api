import logger from "./utils/logger";
import redisClient from "./config/redis";
import { connectMongoDB } from "./utils/connectDB";
import { connectProducer } from "./messaging/producer";
import { trackError, serverHealthGauge } from "./utils/metrics";

interface InitStep {
  name: string;
  fn: () => Promise<void>;
}

async function runStep(step: InitStep): Promise<void> {
  const start = process.hrtime.bigint();
  try {
    await step.fn();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(`${step.name} initialized`, {
      durationMs: ms.toFixed(2),
      eventType: "bootstrap.step.complete",
    });
  } catch (err) {
    trackError(`${step.name}_initialization_failed`, "server_initialization", "critical");
    logger.error(`${step.name} initialization failed`, {
      error: err instanceof Error ? err.message : String(err),
      eventType: "bootstrap.step.failed",
    });
    throw err;
  }
}

function buildInitSteps(): InitStep[] {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  return [
    { name: "mongodb", fn: () => connectMongoDB(mongoUrl) },
    {
      name: "redis",
      fn: async () => {
        await redisClient.ping();
        logger.info("Redis ready", { eventType: "bootstrap.redis.ready" });
      },
    },
    { name: "kafka_producer", fn: connectProducer },
  ];
}

export async function bootstrapServer(): Promise<void> {
  const start = process.hrtime.bigint();
  const steps = buildInitSteps();

  for (const step of steps) {
    await runStep(step);
  }

  const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
  serverHealthGauge.set(1);

  logger.info("Stores service bootstrap complete", {
    totalMs: totalMs.toFixed(2),
    steps: steps.length,
    eventType: "bootstrap.complete",
  });
}