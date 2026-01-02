import logger from "./logger";

class RequestCoalescer {
  private pending = new Map<string, Promise<any>>();

  async coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      logger.debug("Coalescing request - waiting for existing", { key });
      return this.pending.get(key)!;
    }

    const promise = fn()
      .then((result) => {
        this.pending.delete(key);
        return result;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  size() {
    return this.pending.size;
  }
}

export const requestCoalescer = new RequestCoalescer();
