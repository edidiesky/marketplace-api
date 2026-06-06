import logger      from "../utils/logger";
import redisClient from "../config/redis";
import { connectMongoDB }              from "../config/database";
import { connectRabbitMQ }             from "../messaging/connection";
import { connectNotificationConsumer } from "../messaging/consumer";
import { initDispatcher, NotificationDispatcher } from "../providers/notification.dispatcher";
import { ResendEmailProvider }         from "../providers/email/resend.email.provider";
import { TwilioSmsProvider }           from "../providers/sms/twilio.sms.provider";
import { trackError, serverHealthGauge } from "../utils/metrics";
import { SERVICE_NAME }                from "../constants";

interface InitStep {
  name: string;
  fn:   () => Promise<void>;
}


async function runStep(step: InitStep): Promise<void> {
  const start = process.hrtime.bigint();
  try {
    await step.fn();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info("bootstrap_step_complete", {
      event:      "bootstrap_step_complete",
      service:    SERVICE_NAME,
      step:       step.name,
      durationMs: ms.toFixed(2),
    });
  } catch (err) {
    trackError(
      `${step.name}_initialization_failed`,
      "server_initialization",
      "critical"
    );
    logger.error("bootstrap_step_failed", {
      event:   "bootstrap_step_failed",
      service: SERVICE_NAME,
      step:    step.name,
      error:   err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function bootstrapServer(): Promise<void> {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) throw new Error("DATABASE_URL is not defined");

  const steps: InitStep[] = [
    { name: "mongodb",    fn: () => connectMongoDB(mongoUrl)            },
    { name: "redis",      fn: async () => { await redisClient.ping(); } },
    {
      name: "dispatcher",
      fn:   async () => {
        const dispatcher = new NotificationDispatcher(
          new ResendEmailProvider(),
          new TwilioSmsProvider()
        );
        initDispatcher(dispatcher);
      },
    },
    { name: "rabbitmq",             fn: connectRabbitMQ             },
    { name: "notification_consumer", fn: connectNotificationConsumer },
  ];

  const start = process.hrtime.bigint();
  for (const step of steps) {
    await runStep(step);
  }

  const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
  serverHealthGauge.set(1);

  logger.info("bootstrap_complete", {
    event:   "bootstrap_complete",
    service: SERVICE_NAME,
    totalMs: totalMs.toFixed(2),
    steps:   steps.length,
  });
}