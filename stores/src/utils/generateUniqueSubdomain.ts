import Store from "../models/Store";
import logger from "./logger";

/**
 * @description handler to create a unique store
 * @param base 
 * @returns 
 */
export const generateUniqueSubdomain = async (base: string) => {
  try {
    let cleanedBaseName = base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/\s+/g, "")
      .trim();
    if (cleanedBaseName.length < 4) {
      cleanedBaseName = cleanedBaseName + "shop";
    }
    if (cleanedBaseName.length > 20) {
      cleanedBaseName = cleanedBaseName.slice(0, 20);
    }

    let subDomain = cleanedBaseName;
    let counter = 0;
    while (await Store.findOne({ subdomain: subDomain })) {
      let suffix = counter === 1 ? "" : counter;
      subDomain =
        cleanedBaseName.slice(0, 20 - suffix.toString().length) + suffix;
      counter++;
    }
    return subDomain;
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Failed to craete subdomain store:", {
        message: error.message,
      });
    }
  }
};
