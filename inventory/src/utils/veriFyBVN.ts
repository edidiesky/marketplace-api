import axios from "axios";
import Bottleneck from "bottleneck";
import { generateQoriedToken } from "./generateQoriedToken";
import redisClient from "../config/redis";
import logger from "./logger";
import { uploadToCloudinary } from "./uploadToCloudinary";

interface BVNVerificationResult {
  bvn: string;
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

const veriFyBVN = limiter.wrap(
  async (
    bvn: string,
    firstname: string,
    lastname: string,
    rowCount:number
  ): Promise<BVNVerificationResult> => {
    const cacheKey = `qoreid:bvn:${bvn}`;
    const cachedResult = await redisClient.get(cacheKey);
    const tokenManager = new generateQoriedToken();
    tokenManager.startQoriedTokenGeneration();

    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    try {
      const accessToken = await tokenManager.getVerificationToken();
      logger.info("Verifying BVN:", {
        firstname,
        lastname,
        bvn,
        baseUrl: `https://api.qoreid.com/v1/ng/identities/bvn-match/${bvn}`,
      });
      const response = await axios({
        method: "post",
        url: `https://api.qoreid.com/v1/ng/identities/bvn-match/${bvn}`,
        data: { firstname, lastname },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      });

      let photoUrl = response.data.bvn?.photo
        ? `data:image/jpeg;base64,${response.data.bvn.photo}`
        : "";
      if (photoUrl) {
        photoUrl = await uploadToCloudinary(photoUrl, `nin_${bvn}_photo`);
      }

      const result: BVNVerificationResult = {
        bvn,
        isValid:
          response.data.status?.status === "verified" &&
          response.data.summary?.bvn_check?.status === "EXACT_MATCH",
        firstName: response.data.bvn?.firstname,
        lastName: response.data.bvn?.lastname,
        middleName: response.data.bvn?.middlename,
        dateOfBirth: response.data.bvn?.birthdate,
        phone: response.data.bvn?.phone,
        photoUrl,
        gender: response.data.bvn?.gender === "m" ? "MALE" : "FEMALE",
        address: response.data.bvn?.residence?.address1,
        lga: response.data.bvn?.residence?.lga,
        state: response.data.bvn?.residence?.state,
        rowCount
      };

      await redisClient.setex(cacheKey, 24 * 60 * 60, JSON.stringify(result));
      logger.info("BVN verified successfully:");
      return result;
    } catch (error: any) {
      logger.error("BVN verification failed:", {
        bvn,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stack: error.stack,
        data: { firstname, lastname },
      });
      return {
        bvn,
        isValid: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
);

export { veriFyBVN, BVNVerificationResult };