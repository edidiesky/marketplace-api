import axios from "axios";
import logger from "./logger";
import redisClient from "../config/redis";

interface IQoreidTokenResult {
  accessToken: string;
  expiresIn: number;
}

export class generateQoriedToken {
  private clientId: string;
  private secretKey: string;
  private refreshInterval: NodeJS.Timeout | null = null;
  private cacheKey: string;
  private base_url: string;
  constructor() {
    this.clientId = process.env.QOREID_CLIENT_ID!;
    this.secretKey = process.env.QOREID_SECRET!;
    this.cacheKey = "redis:qoreid:token";
    this.refreshInterval = null;
    this.base_url = "https://api.qoreid.com/token";
  }

  async generateToken() {
    try {
      const { data } = await axios.post<IQoreidTokenResult>(
        this.base_url,
        {
          secret: this.secretKey,
          clientId: this.clientId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const result = {
        expiresIn: data.expiresIn,
        accessToken: data.accessToken,
      };
      logger.info(
        "Successfully generated NIN verification access token:"
        // result
      );
      try {
        await redisClient.set(
          this.cacheKey,
          result.accessToken,
          "EX",
          Math.floor(result.expiresIn * 0.9)
        );
      } catch (error: any) {
        logger.error("Failed to store access token on Redis:", {
          data: error.response.data,
          stack: error.stack,
        });
      }

      return result.accessToken;
    } catch (error) {
      logger.error("Failed to generate access token:");
    }
  }

  async getVerificationToken() {
    const cachedToken = await redisClient.get(this.cacheKey);
    if (cachedToken) {
      logger.info("Retrieved Qoreid access token from cache");
      return cachedToken;
    }
    return await this.generateToken();
  }
  startQoriedTokenGeneration() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      try {
        await this.generateToken();
        logger.info("Successfully generated NIN verification access token:");
      } catch (error: any) {
        logger.info("Failed to generat NIN verification access token:", {
          data: error.response.data,
          stack: error.stack,
        });
      }
    }, 1.5 * 60 * 60 * 1000);
  }
  stopQoriedTokenGeneration() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
