import { redisClient } from "../redis/redisClient";
import { rulesEngine } from "../rules/engine";
import logger from "../utils/logger";
import Redis from "ioredis";

const CHANNEL = "gateway:rules:sync";

export interface RulesSyncMessage {
  type: "rules:reload" | "rules:override";
  userId?: string;
}

export class RulesSyncPubSub {
  private subscriber: Redis;

  constructor() {
    this.subscriber = redisClient.getClient().duplicate();
  }

  async subscribe(): Promise<void> {
    await this.subscriber.subscribe(CHANNEL);

    this.subscriber.on("message", async (channel, message) => {
      if (channel !== CHANNEL) return;

      try {
        const payload = JSON.parse(message) as RulesSyncMessage;

        if (payload.type === "rules:reload") {
          await rulesEngine.reload();
          logger.info("[RulesSyncPubSub] Rules reloaded via PubSub");
        } else if (payload.type === "rules:override" && payload.userId) {
          // The override is already applied on the publishing instance
          // Other instances need to reload their full rule set
          await rulesEngine.reload();
          logger.info("[RulesSyncPubSub] Override sync received", {
            userId: payload.userId,
          });
        }
      } catch (err) {
        logger.error("[RulesSyncPubSub] Failed to process sync message", {
          err,
          message,
        });
      }
    });

    this.subscriber.on("error", (err) => {
      logger.error("[RulesSyncPubSub] Subscriber error", { err });
    });

    logger.info("[RulesSyncPubSub] Subscribed to channel", { channel: CHANNEL });
  }

  async publish(message: RulesSyncMessage): Promise<void> {
    try {
      await redisClient.getClient().publish(CHANNEL, JSON.stringify(message));
    } catch (err) {
      logger.warn("[RulesSyncPubSub] Publish failed (non-fatal)", { err });
    }
  }

  async disconnect(): Promise<void> {
    await this.subscriber.unsubscribe(CHANNEL);
    await this.subscriber.quit();
  }
}

export const rulesSyncPubSub = new RulesSyncPubSub();