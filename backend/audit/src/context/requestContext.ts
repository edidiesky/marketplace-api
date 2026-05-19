import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  event?:          string;
  service?:        string;
  userId?:         string;
  organizationId?: string;
  storeId?:        string;
  requestId?:      string;
  traceId?:        string;
  spanId?:         string;
  eventType?:      string;
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