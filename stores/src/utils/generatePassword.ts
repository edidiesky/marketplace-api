import { generate } from "generate-password";
import logger from "../utils/logger";

export const generateUniquePassword = (): string => {
  try {
    const password = generate({
      length: 12,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      excludeSimilarCharacters: true,
      strict: true,
    });
    // logger.info("Generated Password:", {
    //   password,
    // });
    return password;
  } catch (error) {
    logger.error("Error generating unique password", { error });
    throw new Error("Failed to generate password");
  }
};
