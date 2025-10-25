import axios from "axios";
import Bottleneck from "bottleneck";
import { generateQoriedToken } from "./generateQoriedToken";
import redisClient from "../config/redis";
import logger from "./logger";
import { uploadToCloudinary } from "./uploadToCloudinary";
import moment from "moment";

interface CACVerificationResult {
  cac: string;
  isValid: boolean;
  companyName?: string;
  companyType?: string;
  companyEmail?: string;
  city?: string;
  companyDate?: string;
  headOfficeAddress?: string;
  lga?: string;
  state?: string;
  error?: string;
  rowCount?: number;
  natureOfBusiness?:string;
}

const limiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });

const veriFyCAC = limiter.wrap(
  async (
    regNumber: string,
    rowCount: number
  ): Promise<CACVerificationResult> => {
    const cacheKey = `qoreid:cac:${regNumber}`;
    const cachedResult = await redisClient.get(cacheKey);
    const tokenManager = new generateQoriedToken();
    tokenManager.startQoriedTokenGeneration();
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    try {
      const accessToken = await tokenManager.getVerificationToken();
      logger.info("Verifying CAC:");
      const response = await axios({
        method: "post",
        url: `https://api.qoreid.com/v1/ng/identities/cac-premium`,
        data: { regNumber },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      });

      const companyDate = moment(response.data.cac?.registrationDate).format(
        "DD MMM YYYY"
      );

      const result: CACVerificationResult = {
        cac: `RC${response.data.cac.rcNumber}`,
        isValid: response.data.summary?.cac_check === "verified",
        companyName: response.data.cac?.companyName,
        companyType: response.data.cac?.classification,
        natureOfBusiness: response.data.cac?.natureOfBusiness,
        companyEmail: response.data.cac?.companyEmail,
        city: response.data.cac?.city,
        companyDate,
        headOfficeAddress: response.data.cac?.headOfficeAddress,
        rowCount,
      };

      await redisClient.setex(cacheKey, 24 * 60 * 60, JSON.stringify(result));
      logger.info("CAC verified successfully:", { result });
      return result;
    } catch (error: any) {
      logger.error("CAC verification failed:", {
        regNumber,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stack: error.stack,
        data: { regNumber },
      });
      return {
        cac: regNumber,
        isValid: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
);

export { veriFyCAC, CACVerificationResult };
