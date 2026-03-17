/**
 * RulesSyncPubSub - updated for IRules schema
 *
 * Event types:
 *   rules:reload    -> full reload (create, update, delete any rule)
 *   rules:override  -> USER_ID type rule changed (userId = id_value)
 *
 * Gap-fill on reconnect:
 *   Subscriber reconnects -> ready event -> reloadFromRedis()
 *   Recovers missed events by reloading state (not replaying events).
 *   This works because every write updates the Redis hash before publishing.
 *
 * Phase 3 - Streams migration:
 *   Replace PUBLISH/SUBSCRIBE with XADD/XREADGROUP.
 *   Consumer groups + XACK give guaranteed delivery + replay.
 *   Event types and handler logic stay identical - only transport changes.
 */

import Redis from "ioredis";
import { RulesEngine } from "../rules/engine";
import logger from "../utils/logger";

const CHANNEL = "rl:events";

export type PubSubEvent =
  | { type: "rules:reload" }
  | { type: "rules:override"; userId: string; action: "set" | "remove" };

export class RulesSyncPubSub {
  private subscriber: Redis;
  private subscribed = false;

  constructor(
    private readonly publisher: Redis,
    private readonly rulesEngine: RulesEngine,
    private readonly instanceId: string,
  ) {
    this.subscriber = publisher.duplicate();
    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.on("ready", async () => {
      if (this.subscribed) return;
      try {
        await this.subscriber.subscribe(CHANNEL);
        this.subscribed = true;
        logger.info(`[PubSub:${this.instanceId}] subscribed`);
        // Gap-fill on reconnect
        await this.rulesEngine.reloadFromRedis();
      } catch (err: any) {
        logger.error(`[PubSub:${this.instanceId}] subscribe failed:`, err.message);
      }
    });

    this.subscriber.on("message", (_channel: string, raw: string) => {
      this.handleMessage(raw).catch((err) =>
        logger.error("[PubSub] handler error:", err),
      );
    });

    this.subscriber.on("error", (err) => {
      this.subscribed = false;
      logger.error(`[PubSub:${this.instanceId}] error: ${err.message}`);
    });

    this.subscriber.on("close", () => {
      this.subscribed = false;
      logger.warn(`[PubSub:${this.instanceId}] closed`);
    });
  }

  private async handleMessage(raw: string): Promise<void> {
    let msg: PubSubEvent & { from: string; ts: number };
    try {
      msg = JSON.parse(raw);
    } catch {
      logger.error("[PubSub] unparseable message:", raw);
      return;
    }

    if (msg.from === this.instanceId) return;

    logger.info(`[PubSub:${this.instanceId}] ${msg.type} from ${msg.from}`);

    switch (msg.type) {
      case "rules:reload":
        await this.rulesEngine.reloadFromRedis();
        break;
      case "rules:override":
        if (msg.action === "remove") {
          await this.rulesEngine.removeUserOverride(msg.userId);
        } else {
          await this.rulesEngine.reloadFromRedis();
        }
        break;
    }
  }

  async publish(event: PubSubEvent): Promise<void> {
    const payload = JSON.stringify({ ...event, from: this.instanceId, ts: Date.now() });
    try {
      const n = await this.publisher.publish(CHANNEL, payload);
      logger.info(`[PubSub:${this.instanceId}] published ${event.type} to ${n} receivers`);
    } catch (err: any) {
      logger.warn(`[PubSub:${this.instanceId}] publish failed (non-fatal): ${err.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.subscribed) await this.subscriber.unsubscribe(CHANNEL);
      await this.subscriber.quit();
      this.subscribed = false;
    } catch (err: any) {
      logger.warn("[PubSub] disconnect error:", err.message);
    }
  }
}