import dns from "dns/promises"
import logger from "../utils/logger"

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN!

export async function verifyDomainCNAME(customDomain: string): Promise<boolean> {
  try {
    const records = await dns.resolveCname(customDomain)
    const verified = records.some(r => r.endsWith(PLATFORM_DOMAIN))
    logger.info("DNS CNAME check", { customDomain, records, verified })
    return verified
  } catch (err) {
    logger.warn("DNS resolution failed", { customDomain, err })
    return false
  }
}