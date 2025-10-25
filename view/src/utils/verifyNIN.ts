import axios from "axios";
import Bottleneck from "bottleneck";
import { generateQoriedToken } from "./generateQoriedToken";
import redisClient from "../config/redis";
import logger from "./logger";
import { uploadToCloudinary } from "./uploadToCloudinary";

interface NINVerificationResult {
  nin: string;
  isValid: boolean;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  phone?: string;
  photoUrl?: string;
  gender?: string;
  address?: string;
  lga?: string;
  state?: string;
  error?: string;
  rowCount?:number;
}

const limiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });

const verifyNIN = limiter.wrap(
  async (
    nin: string,
    firstname: string,
    lastname: string,
    rowCount:number
  ): Promise<NINVerificationResult> => {
    const cacheKey = `qoreid:nin:${nin}`;
    const cachedResult = await redisClient.get(cacheKey);
    const tokenManager = new generateQoriedToken();
    tokenManager.startQoriedTokenGeneration();

    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    try {
      const accessToken = await tokenManager.getVerificationToken();
      logger.info("Verifying NIN:", {
        firstname,
        lastname,
        nin,
        baseUrl: `https://api.qoreid.com/v1/ng/identities/nin/${nin}`,
      });
      const response = await axios({
        method: "post",
        url: `https://api.qoreid.com/v1/ng/identities/nin/${nin}`,
        data: { firstname, lastname },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      });

      let photoUrl = response.data.nin?.photo
        ? `data:image/jpeg;base64,${response.data.nin.photo}`
        : "";
      if (photoUrl) {
        photoUrl = await uploadToCloudinary(photoUrl, `nin_${nin}_photo`);
      }

      const result: NINVerificationResult = {
        nin,
        isValid:
          response.data.status?.status === "verified" &&
          response.data.summary?.nin_check?.status === "EXACT_MATCH",
        firstName: response.data.nin?.firstname,
        lastName: response.data.nin?.lastname,
        middleName: response.data.nin?.middlename,
        dateOfBirth: response.data.nin?.birthdate,
        phone: response.data.nin?.phone,
        photoUrl,
        gender: response.data.nin?.gender === "m" ? "MALE" : "FEMALE",
        address: response.data.nin?.residence?.address1,
        lga: response.data.nin?.residence?.lga,
        state: response.data.nin?.residence?.state,
        rowCount
      };

      await redisClient.setex(cacheKey, 24 * 60 * 60, JSON.stringify(result));
      logger.info("NIN verified successfully:");
      return result;
    } catch (error: any) {
      logger.error("NIN verification failed:", {
        nin,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stack: error.stack,
        data: { firstname, lastname },
      });
      return {
        nin,
        isValid: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
);

export { verifyNIN, NINVerificationResult };