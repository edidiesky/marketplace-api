import mongoose from "mongoose";
import logger from "./utils/logger";
import redisClient from "./config/redis";
import { connectMongoDB } from "./utils/connectDB";
import { connectProducer } from "./messaging/producer";
import { connectEsProductSyncConsumer } from "./messaging/consumers/esProductSyncConsumer";
import { startOutboxPoller } from "./utils/outBoxPoller";
import { bootstrapProductIndex } from "./config/elasticSearch";
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
    logger.info(`${step.name} initialized`, { durationMs: ms.toFixed(2) });
  } catch (err) {
    trackError(`${step.name}_initialization_failed`, "server_initialization", "critical");
    logger.error(`${step.name} initialization failed`, { error: err });
    throw err;
  }
}

function buildInitSteps(): InitStep[] {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  return [
    { name: "mongodb",          fn: () => connectMongoDB(mongoUrl) },
    { name: "redis",            fn: async () => { await redisClient.ping(); } },
    { name: "kafka_producer",   fn: connectProducer },
    { name: "elasticsearch",    fn: bootstrapProductIndex },
    { name: "es_sync_consumer", fn: connectEsProductSyncConsumer },
    { name: "outbox_poller",    fn: async () => { startOutboxPoller(); } },
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
  logger.info("All dependencies initialized", {
    totalMs: totalMs.toFixed(2),
    steps: steps.length,
  });
}