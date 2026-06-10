
import { Request } from "express";

export interface StoreContext {
  storeId?:        string;
  organizationId?: string;
  storeName?:      string;
}

export interface UserContext {
  userId?:         string;
  userType?:       string;
  organizationId?: string;
}

export interface GatewayContext {
  store:     StoreContext;
  user:      UserContext;
  requestId: string;
}

export function readGatewayContext(req: Request): GatewayContext {
  return {
    store: {
      storeId:        req.headers["x-store-id"]              as string | undefined,
      organizationId: req.headers["x-store-organization-id"] as string | undefined,
      storeName:      req.headers["x-store-name"]            as string | undefined,
    },
    user: {
      userId:         req.headers["x-user-id"]         as string | undefined,
      userType:       req.headers["x-user-type"]       as string | undefined,
      organizationId: req.headers["x-organization-id"] as string | undefined,
    },
    requestId: req.headers["x-request-id"] as string ?? "",
  };
}

export function requireStoreContext(req: Request): Required<StoreContext> {
  const ctx = readGatewayContext(req);

  if (!ctx.store.storeId) {
    throw new Error("x-store-id header is missing. Request must come through a store subdomain.");
  }
  if (!ctx.store.organizationId) {
    throw new Error("x-store-organization-id header is missing.");
  }

  return {
    storeId:        ctx.store.storeId,
    organizationId: ctx.store.organizationId,
    storeName:      ctx.store.storeName ?? "",
  };
}