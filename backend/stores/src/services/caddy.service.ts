import logger from "../utils/logger";
import { SERVICE_NAME } from "../constants";

const CADDY_ADMIN       = process.env.CADDY_ADMIN_URL!;
const PLATFORM_DOMAIN   = process.env.PLATFORM_DOMAIN!;
const FRONTEND_UPSTREAM = process.env.FRONTEND_UPSTREAM!;

class CaddyService {
  private buildSubdomainRoute(
    subdomain: string,
    routeId:   string
  ): Record<string, unknown> {
    return {
      "@id":     routeId,
      match:     [{ host: [`${subdomain}.${PLATFORM_DOMAIN}`] }],
      handle:    [{ handler: "reverse_proxy", upstreams: [{ dial: FRONTEND_UPSTREAM }] }],
      terminal:  true,
    };
  }

  private buildCustomDomainRoute(
    domain:  string,
    routeId: string
  ): Record<string, unknown> {
    return {
      "@id":    routeId,
      match:    [{ host: [domain] }],
      handle:   [{ handler: "reverse_proxy", upstreams: [{ dial: FRONTEND_UPSTREAM }] }],
      terminal: true,
    };
  }

  async registerRoute(
    routeId:     string,
    host:        string,
    isSubdomain: boolean
  ): Promise<void> {
    const route = isSubdomain
      ? this.buildSubdomainRoute(host, routeId)
      : this.buildCustomDomainRoute(host, routeId);

    const res = await fetch(
      `${CADDY_ADMIN}/config/apps/http/servers/srv0/routes/0`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(route),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      logger.error("caddy_route_registration_failed", {
        event:   "caddy_route_registration_failed",
        service: SERVICE_NAME,
        routeId,
        host,
        status:  res.status,
        body,
      });
      throw new Error(`Caddy registration failed: ${res.status}`);
    }

    logger.info("caddy_route_registered", {
      event:   "caddy_route_registered",
      service: SERVICE_NAME,
      routeId,
      host,
    });
  }

  async deregisterRoute(routeId: string): Promise<void> {
    const res = await fetch(`${CADDY_ADMIN}/id/${routeId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      logger.warn("caddy_route_deregistration_failed", {
        event:   "caddy_route_deregistration_failed",
        service: SERVICE_NAME,
        routeId,
        status:  res.status,
      });
    } else {
      logger.info("caddy_route_deregistered", {
        event:   "caddy_route_deregistered",
        service: SERVICE_NAME,
        routeId,
      });
    }
  }
}

export const caddyService = new CaddyService();