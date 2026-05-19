import axios             from "axios";
import {redisClient}       from "../redis/redisClient";
import logger            from "./logger";
import { SERVICE_NAME }  from "../constants";

const STORES_SERVICE_URL  = process.env.STORES_SERVICE_URL ?? "http://stores:4007";
const BASE_DOMAIN         = process.env.BASE_DOMAIN        ?? "selleasi.com";
const CACHE_TTL_SEC       = 300;
const INTERNAL_SECRET     = process.env.INTERNAL_SECRET    ?? "";

export interface SubdomainContext {
  storeId:        string;
  organizationId: string;
  storeName:      string;
}

function extractSubdomain(host: string): string | null {
  const stripped = host.split(":")[0];

  if (
    stripped === BASE_DOMAIN ||
    stripped === `www.${BASE_DOMAIN}` ||
    stripped === "localhost" ||
    stripped === "api-gateway" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(stripped)
  ) {
    return null;
  }

  const parts = stripped.split(".");

  if (parts.length < 3) return null;

  const subdomain = parts[0];

  const reservedSubdomains = new Set([
    "www",
    "api",
    "mail",
    "smtp",
    "ftp",
    "cdn",
    "static",
    "admin",
    "dashboard",
  ]);

  if (reservedSubdomains.has(subdomain)) return null;

  return subdomain;
}

async function resolveFromCache(
  subdomain: string
): Promise<SubdomainContext | null> {
  try {
    const cached = await redisClient.getClient().get(
      `subdomain:${subdomain}`
    );
    if (cached) {
      logger.debug("subdomain_cache_hit", {
        event:     "subdomain_cache_hit",
        service:   SERVICE_NAME,
        subdomain,
      });
      return JSON.parse(cached) as SubdomainContext;
    }
  } catch (err) {
    logger.warn("subdomain_cache_read_failed", {
      event:     "subdomain_cache_read_failed",
      service:   SERVICE_NAME,
      subdomain,
      error:     err instanceof Error ? err.message : String(err),
    });
  }
  return null;
}

async function resolveFromStoresService(
  subdomain: string
): Promise<SubdomainContext | null> {
  try {
    const { data } = await axios.get<{
      success: boolean;
      data: {
        storeId:        string;
        organizationId: string;
        storeName:      string;
      };
    }>(
      `${STORES_SERVICE_URL}/api/v1/stores/internal/subdomain/${subdomain}`,
      {
        headers: {
          "x-internal-secret": INTERNAL_SECRET,
          "content-type":      "application/json",
        },
        timeout: 3_000,
      }
    );

    if (!data.success || !data.data.storeId) return null;

    return {
      storeId:        data.data.storeId,
      organizationId: data.data.organizationId,
      storeName:      data.data.storeName,
    };
  } catch (err) {
    logger.error("subdomain_stores_service_resolution_failed", {
      event:     "subdomain_stores_service_resolution_failed",
      service:   SERVICE_NAME,
      subdomain,
      error:     err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function writeToCache(
  subdomain: string,
  ctx:       SubdomainContext
): Promise<void> {
  try {
    await redisClient.getClient().set(
      `subdomain:${subdomain}`,
      JSON.stringify(ctx),
      "EX",
      CACHE_TTL_SEC
    );
  } catch (err) {
    logger.warn("subdomain_cache_write_failed", {
      event:     "subdomain_cache_write_failed",
      service:   SERVICE_NAME,
      subdomain,
      error:     err instanceof Error ? err.message : String(err),
    });
  }
}

export async function resolveSubdomain(
  host: string
): Promise<SubdomainContext | null> {
  const subdomain = extractSubdomain(host);
  if (!subdomain) return null;

  const cached = await resolveFromCache(subdomain);
  if (cached) return cached;

  const resolved = await resolveFromStoresService(subdomain);
  if (!resolved) return null;

  await writeToCache(subdomain, resolved);

  logger.info("subdomain_resolved", {
    event:     "subdomain_resolved",
    service:   SERVICE_NAME,
    subdomain,
    storeId:   resolved.storeId,
    storeName: resolved.storeName,
  });

  return resolved;
}

export function invalidateSubdomainCache(subdomain: string): Promise<number> {
  return redisClient.getClient().del(`subdomain:${subdomain}`);
}