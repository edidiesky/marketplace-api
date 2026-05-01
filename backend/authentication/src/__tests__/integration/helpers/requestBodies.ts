import bcrypt from "bcryptjs";
import User, { IUser, UserType, TenantStatus } from "../../../models/User";
import { v4 } from "uuid";

export const VALID_PASSWORD = "SecurePass1!";
export const SELLER_ID = "663e1a1d7b2c3d4e5f6a7b8c";

export async function seedUser(
  overrides: Partial<IUser> & { password?: string } = {},
): Promise<IUser> {
  const password = overrides.password ?? VALID_PASSWORD;
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const doc = await User.create({
    email: `user-${v4().slice(0, 8)}@example.com`,
    passwordHash,
    firstName: "Jane",
    lastName: "Doe",
    userType: UserType.SELLERS,
    phone: "+2348100099551",
    isEmailVerified: true,
    tenantStatus: TenantStatus.ACTIVE,
    tenantPlan: "FREE",
    falseIdentificationFlag: false,
    ...overrides,
  });

  return doc.toObject() as IUser;
}