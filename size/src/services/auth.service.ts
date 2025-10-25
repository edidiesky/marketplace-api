import { getSingleTINFromPool } from "../utils/generateTIN";

/**
 * @description Isolates TIN retrieval for a given user type
 * @param userType - The type of user (e.g., INDIVIDUAL, COMPANY)
 * @param maxRetries - Number of retries for TIN retrieval
 * @returns Promise<string> - The generated TIN
 */
export const retrieveTIN = async (userType: string, maxRetries: number = 4): Promise<string> => {
  if (!['INDIVIDUAL', 'COMPANY'].includes(userType)) {
    throw new Error("Invalid user type. Please select either 'INDIVIDUAL' or 'COMPANY'.");
  }

  const tin = await getSingleTINFromPool(userType, maxRetries);
  if (!tin) {
    throw new Error('Unable to generate a Taxpayer Identification Number (TIN) at this time.');
  }

  return tin;
};