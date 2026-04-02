/**
 * seedrules.ts
 *
 * Inserts rate limit rules into the gateway MongoDB database.
 * Safe to run multiple times: idempotent via (id_value, resource) unique check.
 *
 * Usage:
 *   npx tsnode seedrules.ts
 *   npx tsnode seedrules.ts destroy    # wipes all rules first
 *
 * Env: GATEWAY_DATABASE_URL (or DATABASE_URL as fallback)
 *
 * Rules seeded:
 *   1. Global default: 4 req / 60s, tokenbucket, wildcard route, IP identity
 *      This is the catchall. Any request not matched by a more specific rule
 *      falls through to the engine's buildDefault() which also returns 60/min.
 *      By seeding an explicit wildcard rule we override buildDefault() and
 *      enforce 4/min from the DB, which is what you want for testing.
 *
 *   2. Auth routes: 4 req / 60s, slidingwindowlog, /auth/* prefix, IP identity
 *      Sliding window gives precise enforcement with no boundary burst.
 *      Important for login/OTP endpoints that are bruteforce targets.
 *
 *   3. Payment webhooks: intentionally NOT seeded. The gateway bypasses
 *      rate limiting for /payment/api/v1/webhooks/* in app.ts already.
 *
 * How the engine picks this up:
 *   rulesEngine.start() calls loadFromDB() on boot.
 *   After seeding, restart the gateway or call POST /admin/rules/reload
 *   if you have that endpoint, OR wait up to 60s for the periodic reload.
 *   Fastest path for local testing: restart the gateway container.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
enum RulesIDType {
  USER_ID = "user_id",
  IP = "ip",
  API_KEY = "api_key",
}

interface IRuleInput {
  id_type: RulesIDType;
  id_value: string;
  resource: string;
  limits: {
    algorithm: string;
    max_req: number;
    windowMs: number;
  };
  enabled: boolean;
}

const RulesSchema = new mongoose.Schema(
  {
    id_type: { type: String, enum: Object.values(RulesIDType), required: true },
    id_value: { type: String, required: true },
    resource: { type: String, required: true },
    limits: {
      algorithm: { type: String },
      max_req: { type: Number },
      windowMs: { type: Number },
    },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const RulesModel = mongoose.model("Rules", RulesSchema);

const RULES: IRuleInput[] = [
  {
    id_type: RulesIDType.IP,
    id_value: "*",
    resource: "*",
    limits: {
      algorithm: "tokenbucket",
      max_req: 4,
      windowMs: 60_000,
    },
    enabled: true,
  },
  {
    id_type: RulesIDType.IP,
    id_value: "*",
    resource: "/auth/*",
    limits: {
      algorithm: "slidingwindowlog",
      max_req: 4,
      windowMs: 60_000,
    },
    enabled: true,
  },
];

// 
// Helpers
// 

function parseArgs(): { destroy: boolean } {
  return { destroy: process.argv.includes("destroy") };
}

async function destroyRules(): Promise<void> {
  const result = await RulesModel.deleteMany({});
  console.log(`[seedrules] Destroyed ${result.deletedCount} rule(s)`);
}

async function seedRules(): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const rule of RULES) {
    const exists = await RulesModel.findOne({
      id_value: rule.id_value,
      resource: rule.resource,
    });

    if (exists) {
      console.log(
        `[seedrules] SKIP  id_value=${rule.id_value} resource=${rule.resource} (already exists, _id=${exists._id})`,
      );
      skipped++;
      continue;
    }

    const doc = await RulesModel.create(rule);
    console.log(
      `[seedrules] CREATE id_value=${rule.id_value} resource=${rule.resource} algorithm=${rule.limits.algorithm} max_req=${rule.limits.max_req} _id=${doc._id}`,
    );
    created++;
  }

  console.log(
    `[seedrules] Done. created=${created} skipped=${skipped} total=${RULES.length}`,
  );
}

// Main

async function main(): Promise<void> {
  const mongoUrl = process.env.DATABASE_URL;

  if (!mongoUrl) {
    console.error(
      "[seedrules] ERROR: GATEWAY_DATABASE_URL or DATABASE_URL must be set",
    );
    process.exit(1);
  }

  const { destroy } = parseArgs();

  console.log("[seedrules] Connecting to MongoDB...");
  await mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 10_000,
  });
  console.log("[seedrules] Connected");

  if (destroy) {
    await destroyRules();
  }

  await seedRules();

  await mongoose.connection.close();
  console.log("[seedrules] Connection closed");
}

main().catch((err) => {
  console.error("[seedrules] Fatal error:", err);
  process.exit(1);
});