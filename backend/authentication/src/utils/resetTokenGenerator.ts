import { createHmac, randomBytes } from "crypto";

export async function generateSecureToken(
  userId:  string,
  purpose = "reset"
): Promise<string> {
  const random    = randomBytes(32).toString("hex");
  const timestamp = Date.now().toString();
  const secret    = process.env.JWT_CODE ?? "fallback-secret";
  const payload   = `${userId}:${purpose}:${random}:${timestamp}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}