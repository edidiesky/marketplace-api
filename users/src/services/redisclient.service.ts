import Redis from "ioredis";
import redisClient from "../config/redis";

export class RedisClientService {
  private redisClient: Redis;
  private timeout: number;
  constructor() {
    this.redisClient = redisClient;
    this.timeout = 24 * 60;
  }
  get = async (key: string): Promise<string | null> => {
    return await this.redisClient.get(key);
  };
  keys = async (key: string): Promise<string[] | null> => {
    return await this.redisClient.keys(key);
  };
  del = async (keys: string[]): Promise<number> => {
    return await this.redisClient.del(...keys);
  };
  set = async (
    key: string,
    value: string,
    timeout: number = this.timeout,
  ): Promise<string | null> => {
    return await this.redisClient.set(key, value, "EX", timeout);
  };
}
export const redisClientService = new RedisClientService();
