import dns from "dns/promises";
import logger from "../utils/logger";
import { SERVICE_NAME } from "../constants";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN!;

export async function verifyDomainCNAME(
  customDomain: string
): Promise<boolean> {
  try {
    const records  = await dns.resolveCname(customDomain);
    const verified = records.some((r) => r.endsWith(PLATFORM_DOMAIN));

    logger.info("dns_cname_check_completed", {
      event:        "dns_cname_check_completed",
      service:      SERVICE_NAME,
      customDomain,
      records,
      verified,
    });

    return verified;
  } catch (err) {
    logger.warn("dns_cname_resolution_failed", {
      event:        "dns_cname_resolution_failed",
      service:      SERVICE_NAME,
      customDomain,
      error:        err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}