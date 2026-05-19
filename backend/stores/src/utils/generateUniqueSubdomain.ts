import { storeRepository } from "../domains/stores/store.repository";
import logger              from "./logger";
import { SERVICE_NAME }    from "../constants";
import { AppError } from "./AppError";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function appendSuffix(base: string, suffix: number): string {
  const maxBase = 36;
  const trimmed = base.slice(0, maxBase);
  return `${trimmed}-${suffix}`;
}

export async function generateUniqueSubdomain(
  name: string
): Promise<string> {
  const base = slugify(name);

  if (!base) {
    throw AppError.internal(
      "Store name produced an empty subdomain. Use alphanumeric characters.",
    );
  }

  const existing = await storeRepository.findBySubdomain(base);
  if (!existing) {
    logger.debug("subdomain_generated_no_conflict", {
      event:     "subdomain_generated_no_conflict",
      service:   SERVICE_NAME,
      subdomain: base,
    });
    return base;
  }

  for (let attempt = 1; attempt <= 10; attempt++) {
    const candidate = appendSuffix(base, attempt);
    const conflict  = await storeRepository.findBySubdomain(candidate);

    if (!conflict) {
      logger.debug("subdomain_generated_with_suffix", {
        event:     "subdomain_generated_with_suffix",
        service:   SERVICE_NAME,
        subdomain: candidate,
        attempt,
      });
      return candidate;
    }
  }

  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const fallback     = appendSuffix(base, parseInt(randomSuffix, 36));

  logger.warn("subdomain_generated_with_random_suffix", {
    event:     "subdomain_generated_with_random_suffix",
    service:   SERVICE_NAME,
    subdomain: fallback,
    base,
  });

  return fallback;
}