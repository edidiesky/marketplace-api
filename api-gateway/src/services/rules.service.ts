/**
 * RulesService
 *
 * Responsibilities:
 *   1. CRUD via RulesRepository (DB + Redis cache)
 *   2. After any write: update the in-memory RulesEngine + broadcast via PubSub
 *      so all gateway instances pick up the change within one Redis RTT
 *   3. Translate IRules (DB shape) -> RateLimitRule (engine shape) for the engine
 *
 * Why the service owns the PubSub publish:
 *   The controller should not know about PubSub or the engine.
 *   The repository should not know about the engine.
 *   The service sits between them and is the right place to coordinate
 *   the three writes: DB -> engine -> broadcast.
 *
 * Failure handling:
 *   DB write fails         -> throw, nothing else happens
 *   Engine update fails    -> log + continue (engine reloads on next TTL anyway)
 *   PubSub publish fails   -> log + continue (non-fatal, other instances reload on TTL)
 */

import { IRules, RulesIDType } from "../models/Rules";
import { IRulesRepository } from "../repository/IRulesRepository";
import { RulesEngine } from "../rules/engine";
import { RulesSyncPubSub } from "../pubsub/rulesSync";
import { RateLimitRule, UserTier, Algorithm } from "../rules/repository";
import logger from "../utils/logger";
import { FilterQuery } from "mongoose";
import mongoose from "mongoose";

export interface CreateRuleDTO {
  id_type: RulesIDType;
  id_value: string; // userId, IP, or API key value
  resource: string; // route pattern e.g. "/auth/*"
  limits: {
    algorithm: Algorithm;
    max_req: number;
    windowMs: number;
    refillRate?: number; // TB only
    burstMultiplier?: number; // TB only
  };
  enabled?: boolean;
}

export interface UpdateRuleDTO {
  limits?: Partial<CreateRuleDTO["limits"]>;
  enabled?: boolean;
  resource?: string;
}

export interface PaginatedRules {
  data: IRules[];
  total: number;
  page: number;
  limit: number;
}

export class RulesService {
  constructor(
    private readonly repo: IRulesRepository,
    private readonly rulesEngine: RulesEngine,
    private readonly pubsub: RulesSyncPubSub,
  ) {}

  /**
   * Map IRules (Mongoose doc) to RateLimitRule (engine shape).
   * The engine needs a flat structure that matches the algorithm interface.
   * The DB model stores the same data but with different field names.
   */
  private toEngineRule(rule: IRules): RateLimitRule {
    return {
      id: rule._id.toString(),
      // id_type USER_ID -> tier-based matching uses id_value as userId
      // id_type IP -> route wildcard match
      // id_type API_KEY -> treated as pro/enterprise tier
      route: rule.resource,
      tier: this.inferTier(rule.id_type) as UserTier,
      algorithm: (rule.limits.algorithm as Algorithm) ?? "token-bucket",
      limit: rule.limits.max_req,
      windowMs: rule.limits.windowMs,
      refillRate: undefined, // extend IRules.limits if needed
      burstMultiplier: undefined,
      enabled: rule.enabled ?? true,
    };
  }

  private inferTier(idType: RulesIDType): string {
    switch (idType) {
      case RulesIDType.API_KEY:
        return "pro";
      case RulesIDType.USER_ID:
        return "*"; // matched by userId override
      case RulesIDType.IP:
        return "free";
      default:
        return "*";
    }
  }

  async createRule(
    data: CreateRuleDTO,
    session?: mongoose.ClientSession,
  ): Promise<IRules> {
    // Check for duplicate before creating
    const existing = await this.repo.RulesExists(data.id_value, data.resource);
    if (existing) {
      logger.error(
        `Rule already exists for id_value=${data.id_value} resource=${data.resource}`,
        {
          ...data,
        },
      );
      throw new Error(
        `Rule already exists for id_value=${data.id_value} resource=${data.resource}`,
      );
    }

    const rule = await this.repo.createRules(
      {
        id_type: data.id_type,
        id_value: data.id_value,
        resource: data.resource,
        limits: {
          algorithm: data.limits.algorithm,
          max_req: data.limits.max_req,
          windowMs: data.limits.windowMs,
        },
        enabled: data.enabled ?? true,
      },
      session,
    );
    logger.info("Rule has been created succesfully:", {
      id: rule._id,
    });
    await this.syncToEngine(rule, "upsert");
    return rule;
  }

  async updateRule(ruleId: string, data: UpdateRuleDTO): Promise<IRules> {
    const existing = await this.repo.getSingleRules(ruleId);
    if (!existing) {
      logger.error(`Rule not found: ${ruleId}`, {
        ruleId,
      });
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const updated = await this.repo.updateRules(
      data as Partial<IRules>,
      ruleId,
    );
    if (!updated) {
      logger.error(`Update failed for rule: ${ruleId}`);
      throw new Error(`Update failed for rule: ${ruleId}`);
    }
    logger.info("Rule has been created succesfully:", {
      id: updated._id,
    });
    await this.syncToEngine(updated, "upsert");
    return updated;
  }

  async deleteRule(ruleId: string): Promise<void> {
    const existing = await this.repo.getSingleRules(ruleId);
    if (!existing) throw new Error(`Rule not found: ${ruleId}`);

    await this.repo.deleteRules(ruleId);
    await this.syncToEngine(existing, "delete");
  }

  async getRules(
    query: FilterQuery<IRules>,
    page: number,
    limit: number,
  ): Promise<PaginatedRules> {
    const skip = (page - 1) * limit;
    const data = await this.repo.getStoreRules(query, skip, limit);
    return {
      data: data ?? [],
      total: data?.length ?? 0,
      page,
      limit,
    };
  }

  async getSingleRule(ruleId: string): Promise<IRules> {
    const rule = await this.repo.getSingleRules(ruleId);
    if (!rule) throw new Error(`Rule not found: ${ruleId}`);
    return rule;
  }

  async toggleRule(ruleId: string, enabled: boolean): Promise<IRules> {
    return this.updateRule(ruleId, { enabled });
  }

  /**
   * Sync a DB rule change to the in-memory RulesEngine and broadcast to
   * all other gateway instances via PubSub.
   *
   * Both operations are fire-and-forget after the DB write succeeds.
   * The DB is the source of truth. Engine + PubSub are best-effort sync.
   */
  private async syncToEngine(
    rule: IRules,
    action: "upsert" | "delete",
  ): Promise<void> {
    const engineRule = this.toEngineRule(rule);

    try {
      if (action === "upsert") {
        await this.rulesEngine.upsertRule(engineRule);
      }
      // For delete: engine will pick it up on next Redis reload
      // We do not need an explicit deleteFromEngine method because
      // the reload reads the DB state (rule no longer there)
    } catch (err: any) {
      logger.error(
        "[RulesService] failed to sync rule to engine (non-fatal):",
        err.message,
      );
    }

    try {
      await this.pubsub.publish({ type: "rules:reload" });
    } catch (err: any) {
      logger.warn(
        "[RulesService] PubSub publish failed (non-fatal):",
        err.message,
      );
    }

    // For USER_ID type rules: also set as a per-user override in the engine
    // This gives immediate effect without waiting for the rule match logic
    if (rule.id_type === RulesIDType.USER_ID && action === "upsert") {
      try {
        await this.rulesEngine.setUserOverride(rule.id_value, engineRule);
        await this.pubsub.publish({
          type: "rules:override",
          userId: rule.id_value,
        });
      } catch (err: any) {
        logger.warn("[RulesService] failed to set user override:", err.message);
      }
    }

    if (rule.id_type === RulesIDType.USER_ID && action === "delete") {
      try {
        await this.rulesEngine.removeUserOverride(rule.id_value);
        await this.pubsub.publish({
          type: "rules:override",
          userId: rule.id_value,
        });
      } catch (err: any) {
        logger.warn(
          "[RulesService] failed to remove user override:",
          err.message,
        );
      }
    }
  }
}
