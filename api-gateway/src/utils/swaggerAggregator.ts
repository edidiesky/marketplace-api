import axios from "axios";
import { services } from "../constants";
import logger from "./logger";

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

const FETCH_TIMEOUT = 5000;

export async function aggregateSpecs(): Promise<OpenAPISpec> {
  const serviceEntries = Object.entries(services) as [string, string][];

  const results = await Promise.allSettled(
    serviceEntries.map(async ([serviceName, serviceUrl]) => {
      const res = await axios.get(`${serviceUrl}/openapi.json`, {
        timeout: FETCH_TIMEOUT,
        validateStatus: (s) => s === 200,
      });
      return { serviceName, spec: res.data as OpenAPISpec };
    })
  );

  const merged: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "Selleasi Marketplace API",
      version: "1.0.0",
      description:
        "Unified API documentation for all Selleasi microservices. " +
        "All requests go through the API gateway at the base URL shown above.",
    },
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    tags: [],
  };

  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn("Failed to fetch spec from service", {
        reason: result.reason?.message ?? String(result.reason),
      });
      continue;
    }

    const { serviceName, spec } = result.value;
    // prefixing
    for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
      const prefixedPath = `/${serviceName}${path}`;
      merged.paths[prefixedPath] = pathItem;
    }

    // Merging schemas with service prefix to avoid name collisions
    for (const [schemaName, schema] of Object.entries(
      spec.components?.schemas ?? {}
    )) {
      const prefixedName = `${capitalize(serviceName)}_${schemaName}`;
      merged.components!.schemas![prefixedName] = schema;
    }

    // Merging tags
    if (spec.tags) {
      for (const tag of spec.tags) {
        const prefixedTag = {
          name: `${capitalize(serviceName)} - ${tag.name}`,
          description: tag.description,
        };
        if (!merged.tags!.find((t) => t.name === prefixedTag.name)) {
          merged.tags!.push(prefixedTag);
        }
      }
    }
  }

  return merged;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}