import logger from "../utils/logger";
import redisClient from "../config/redis";
import { connectRabbitMQ } from "../messaging/connection";
import { connectAuthConsumer } from "../messaging/consumer";
// import { seedRoles } from "../seeds/roles.seed";
import { trackError, serverHealthGauge } from "../utils/metrics";
import { SERVICE_NAME } from "../constants";
import { connectMongoDB } from "../config/database";

interface InitStep {
  name: string;
  fn: () => Promise<void>;
}

async function runStep(step: InitStep): Promise<void> {
  const start = process.hrtime.bigint();
  try {
    await step.fn();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info("bootstrap_step_complete", {
      event: "bootstrap_step_complete",
      service: SERVICE_NAME,
      step: step.name,
      durationMs: ms.toFixed(2),
    });
  } catch (err) {
    trackError(
      `${step.name}_initialization_failed`,
      "server_initialization",
      "critical",
    );
    logger.error("bootstrap_step_failed", {
      event: "bootstrap_step_failed",
      service: SERVICE_NAME,
      step: step.name,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function bootstrapServer(): Promise<void> {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) throw new Error("DATABASE_URL is not defined");

  const steps: InitStep[] = [
    { name: "mongodb", fn: () => connectMongoDB(mongoUrl) },
    {
      name: "redis",
      fn: async () => {
        await redisClient.ping();
      },
    },
    { name: "rabbitmq", fn: connectRabbitMQ },
    // { name: "seed_permissions", fn: async () => { await seedPermissions(); } },
    // { name: "seed_roles",       fn: seedRoles },
    { name: "auth_consumer", fn: connectAuthConsumer },
  ];

  const start = process.hrtime.bigint();
  for (const step of steps) {
    await runStep(step);
  }

  const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
  serverHealthGauge.set(1);

  logger.info("bootstrap_complete", {
    event: "bootstrap_complete",
    service: SERVICE_NAME,
    totalMs: totalMs.toFixed(2),
    steps: steps.length,
  });
}
