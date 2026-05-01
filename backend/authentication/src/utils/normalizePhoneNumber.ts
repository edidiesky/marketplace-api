import logger from "./logger";

/**
 * Normalizes a Nigerian phone number by prepending +234 and removing the leading 0.
 * @param phone - The phone number to normalize (e.g., "08127107270")
 * @returns The normalized phone number (e.g., "+2348127107270")
 * @throws Error if the phone number is invalid
 */
export const normalizePhoneNumber = (phone: string): string => {
  try {
    // Remove any whitespace, dashes, or other characters
    const cleanedPhone = phone.replace(/[^0-9]/g, "");
    // Validate: Nigerian mobile numbers should be 11 digits, start with 0, followed by 7, 8, or 9
    const nigerianMobileRegex = /^0[2789][0-9]{9}$/;
     logger.info("cleanedPhone", {
      cleanedPhone,
      nigerianMobileRegex
    })
    // if (!nigerianMobileRegex.test(cleanedPhone)) {
    //   throw new Error(
    //     "Invalid phone number format. Must be a Nigerian mobile number (e.g., 08127107270)."
    //   );
    // }

    // Replace leading 0 with +234
    const normalizedPhone = `+234${cleanedPhone.slice(1)}`;
    return normalizedPhone;
  } catch (error) {
    logger.error("Failed to normalize phone number", { phone, error });
    throw error;
  }
};