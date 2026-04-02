import RulesModel, { IRules, RulesIDType } from "../models/Rules";
import { RateLimitRule, UserOverride, Algorithm } from "./repository";
import logger from "../utils/logger";

const RELOAD_INTERVAL_MS = 60_000;

/**
 * Routes that should use sliding-window-log on the default fallback rule.
 * Token bucket is used for everything else.
 * Auth routes are high-abuse targets: sliding log gives precise per-IP
 * enforcement with no boundary burst, which matters for brute-force protection.
 */
const SLIDING_WINDOW_DEFAULT_PREFIXES = ["/auth/"];

export class RulesEngine {
  private rules: Map<string, RateLimitRule> = new Map();
  private userOverrides: Map<string, RateLimitRule> = new Map();
  private reloadTimer: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    await this.loadFromDB();
    this.reloadTimer = setInterval(async () => {
      try {
        await this.loadFromDB();
        logger.info("[RulesEngine] Periodic reload complete", {
          ruleCount: this.rules.size,
        });
      } catch (err) {
        logger.error("[RulesEngine] Periodic reload failed", { err });
      }
    }, RELOAD_INTERVAL_MS);
  }

  stop(): void {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
    }
  }

  async reload(): Promise<void> {
    await this.loadFromDB();
    logger.info("[RulesEngine] Reloaded via PubSub signal", {
      ruleCount: this.rules.size,
    });
  }

  private async loadFromDB(): Promise<void> {
    const docs = await RulesModel.find({ enabled: true }).lean().exec();
    const next = new Map<string, RateLimitRule>();

    for (const doc of docs) {
      const rule = this.toEngineRule(doc as IRules);
      next.set(rule.id, rule);
    }

    this.rules = next;
  }

  private toEngineRule(doc: IRules): RateLimitRule {
    return {
      id: doc._id.toString(),
      route: doc.resource,
      tier: this.inferTier(doc.id_type),
      algorithm: (doc.limits.algorithm as Algorithm) ?? "token-bucket",
      limit: doc.limits.max_req,
      windowMs: doc.limits.windowMs,
      enabled: doc.enabled ?? true,
    };
  }

  private inferTier(idType: RulesIDType): string {
    switch (idType) {
      case RulesIDType.API_KEY:
        return "pro";
      case RulesIDType.USER_ID:
        return "*";
      case RulesIDType.IP:
        return "free";
      default:
        return "*";
    }
  }

  match(userId: string, route: string): RateLimitRule {
    // Per-user override has highest priority.
    const userRule = this.userOverrides.get(userId);
    if (userRule && userRule.enabled) {
      return userRule;
    }

    // Route-pattern match from DB rules (insertion order, first match wins).
    for (const rule of this.rules.values()) {
      if (rule.enabled && this.routeMatches(route, rule.route)) {
        return rule;
      }
    }

    // Global default when no DB rule matches.
    return this.buildDefault(route);
  }

  private routeMatches(incomingRoute: string, ruleRoute: string): boolean {
    if (ruleRoute.endsWith("*")) {
      const prefix = ruleRoute.slice(0, -1);
      return incomingRoute.startsWith(prefix);
    }
    return incomingRoute === ruleRoute;
  }

  private buildDefault(route: string): RateLimitRule {
    const useSlidingWindow = SLIDING_WINDOW_DEFAULT_PREFIXES.some((prefix) =>
      route.startsWith(prefix),
    );

    return {
      id: "default",
      route: "*",
      tier: "free",
      algorithm: useSlidingWindow ? "sliding-window-log" : "token-bucket",
      limit: 60,
      windowMs: 60_000,
      enabled: true,
    };
  }

  async upsertRule(rule: RateLimitRule): Promise<void> {
    this.rules.set(rule.id, rule);
    logger.info("[RulesEngine] Rule upserted in memory", { ruleId: rule.id });
  }

  /**
   * Immediately remove the rule from the in-memory map.
   * Without this, a deleted DB rule stays active for up to RELOAD_INTERVAL_MS
   * (60s) because loadFromDB only runs on the interval or a PubSub signal.
   * The PubSub signal triggers reload() which calls loadFromDB(), so after
   * RulesService.syncToEngine emits rules:reload, the next reload will not
   * include the deleted rule. But on the publishing instance itself there is
   * a window between the delete and the reload signal completing. Calling
   * deleteRule() here closes that window to zero on the publishing instance.
   */
  async deleteRule(ruleId: string): Promise<void> {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      logger.info("[RulesEngine] Rule deleted from memory", { ruleId });
    } else {
      logger.warn("[RulesEngine] deleteRule called for unknown ruleId", {
        ruleId,
      });
    }
  }

  async setUserOverride(userId: string, rule: RateLimitRule): Promise<void> {
    this.userOverrides.set(userId, rule);
    logger.info("[RulesEngine] User override set", { userId });
  }

  async removeUserOverride(userId: string): Promise<void> {
    this.userOverrides.delete(userId);
    logger.info("[RulesEngine] User override removed", { userId });
  }

  getStats(): { ruleCount: number; overrideCount: number } {
    return {
      ruleCount: this.rules.size,
      overrideCount: this.userOverrides.size,
    };
  }
}

export const rulesEngine = new RulesEngine();