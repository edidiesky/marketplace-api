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

function rewriteRefs(node: any, prefix: string): any {
  if (Array.isArray(node)) {
    return node.map((item) => rewriteRefs(item, prefix));
  }

  if (node !== null && typeof node === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(node)) {
      if (
        key === "$ref" &&
        typeof value === "string" &&
        value.startsWith("#/components/schemas/")
      ) {
        const schemaName = value.replace("#/components/schemas/", "");
        result[key] = `#/components/schemas/${prefix}_${schemaName}`;
      } else {
        result[key] = rewriteRefs(value, prefix);
      }
    }
    return result;
  }

  return node;
}

function rewriteTags(node: any, servicePrefix: string): any {
  if (Array.isArray(node)) {
    return node.map((item) => rewriteTags(item, servicePrefix));
  }

  if (node !== null && typeof node === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "tags" && Array.isArray(value)) {
        result[key] = (value as string[]).map(
          (t) => `${servicePrefix} - ${t}`
        );
      } else {
        result[key] = rewriteTags(value, servicePrefix);
      }
    }
    return result;
  }

  return node;
}

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
    const servicePrefix = capitalize(serviceName);
    for (const [schemaName, schema] of Object.entries(
      spec.components?.schemas ?? {}
    )) {
      const prefixedName = `${servicePrefix}_${schemaName}`;
      merged.components!.schemas![prefixedName] = rewriteRefs(
        schema,
        servicePrefix
      );
    }
    for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
      const prefixedPath = `/${serviceName}${path}`;
      const refRewritten = rewriteRefs(pathItem, servicePrefix);
      const tagRewritten = rewriteTags(refRewritten, servicePrefix);
      merged.paths[prefixedPath] = tagRewritten;
    }

    for (const tag of spec.tags ?? []) {
      const prefixedTag = {
        name: `${servicePrefix} - ${tag.name}`,
        ...(tag.description ? { description: tag.description } : {}),
      };
      if (!merged.tags!.find((t) => t.name === prefixedTag.name)) {
        merged.tags!.push(prefixedTag);
      }
    }
  }

  return merged;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}