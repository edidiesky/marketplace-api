import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  requestId:       string;
  traceId?:        string;
  spanId?:         string;
  userId?:         string;
  organizationId?: string;
  eventType?:      string;
  storeId?:string;
  method?:string;
  path?:string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run<T>(ctx: RequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },
  get(): RequestContext | undefined {
    return storage.getStore();
  },
  set(patch: Partial<RequestContext>): void {
    const ctx = storage.getStore();
    if (ctx) Object.assign(ctx, patch);
  },
};