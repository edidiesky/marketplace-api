
import logger from "../utils/logger"

const CADDY_ADMIN = process.env.CADDY_ADMIN_URL!
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN!
const FRONTEND_UPSTREAM = process.env.FRONTEND_UPSTREAM!

export class CaddyService {
  private buildSubdomainRoute(subdomain: string, routeId: string) {
    return {
      "@id": routeId,
      match: [{ host: [`${subdomain}.${PLATFORM_DOMAIN}`] }],
      handle: [{ handler: "reverse_proxy", upstreams: [{ dial: FRONTEND_UPSTREAM }] }],
      terminal: true
    }
  }

  private buildCustomDomainRoute(domain: string, routeId: string) {
    return {
      "@id": routeId,
      match: [{ host: [domain] }],
      handle: [{ handler: "reverse_proxy", upstreams: [{ dial: FRONTEND_UPSTREAM }] }],
      terminal: true
    }
  }

  async registerRoute(routeId: string, host: string, isSubdomain: boolean): Promise<void> {
    const route = isSubdomain
      ? this.buildSubdomainRoute(host, routeId)
      : this.buildCustomDomainRoute(host, routeId)

    const res = await fetch(`${CADDY_ADMIN}/config/apps/http/servers/srv0/routes/0`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(route)
    })

    if (!res.ok) {
      const body = await res.text()
      logger.error("Caddy route registration failed", { routeId, host, body })
      throw new Error(`Caddy registration failed: ${res.status}`)
    }

    logger.info("Caddy route registered", { routeId, host })
  }

  async deregisterRoute(routeId: string): Promise<void> {
    const res = await fetch(`${CADDY_ADMIN}/id/${routeId}`, { method: "DELETE" })
    if (!res.ok) {
      logger.warn("Caddy route deregistration failed", { routeId })
    }
  }
}

export const caddyService = new CaddyService()