import { authenticator } from "otplib";
import { PasswordResetToken } from "../models/ResetPassword";
import logger from "../utils/logger";

// Lazy-loaded nanoid with type safety
let nanoid: (size?: number) => string;

const ALPHANUMERIC_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const initializeNanoid = async () => {
  try {
    const { customAlphabet } = await import("nanoid");
    nanoid = customAlphabet(ALPHANUMERIC_ALPHABET, 32);
  } catch (error) {
    logger.error("Failed to load nanoid module", { error });
    throw new Error("Unable to initialize token generator");
  }
};

export const getNanoid = async (): Promise<(size?: number) => string> => {
  if (!nanoid) {
    await initializeNanoid();
  }
  return nanoid;
};

export const generateSecureToken = async (
  userId: string,
  type: "reset" | "2fa" | "refresh" = "reset"
): Promise<string> => {
  const nanoidFunc = await getNanoid();
  try {
    const token =
      type === "2fa"
        ? authenticator.generate(
            process.env.SECRET_2FA_KEY || (await getNanoid())(20)
          )
        : nanoidFunc();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    if (type === "refresh") {
      return nanoid(32);
    }

    if (type === "reset") {
      await PasswordResetToken.create({
        userId,
        token,
        expiresAt,
      });
    }
    return token;
  } catch (error) {
    logger.error(`Error generating ${type} token`, { error, userId });
    throw new Error(`Failed to generate ${type} token`);
  }
};

export const verify2FAToken = (token: string, secret: string): boolean => {
  return authenticator.check(token, secret);
};
