import mongoose from "mongoose";
import logger from "../utils/logger";
import bcrypt from "bcryptjs";

import { connectMongoDB } from "../utils/connectDB";
import User, {
  DirectorateType,
  UserType,
} from "../models/User";
import dotenv from "dotenv";
import { Role, UserRole } from "../models/Role";
import { getSingleTINFromPool } from "../utils/generateTIN";

dotenv.config();

async function seedSuperAdmin(): Promise<void> {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    logger.error("MongoDB connection string is not defined");
    throw new Error("MongoDB connection string is not defined");
  }

  await connectMongoDB(mongoUrl);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    // Check if SUPER_ADMIN role exists
    let superAdminRole = await Role.findOne({
      roleCode: "SUPER_ADMIN",
    }).session(session);
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash("Mcgarvey1000@", salt);
    // Generate TIN
    const tin = await getSingleTINFromPool("SUPERADMIN");
    // Create super admin user
    const [superAdmin] = await User.create(
      [
        {
          tin,
          userType: UserType.SUPERADMIN,
          email: "superadmin@ibomtax.net",
          nin: "12345678901",
          phone: "+2348031234567",
          firstName: "System",
          lastName: "Admin",
          middleName: "Super",
          directorate: DirectorateType.ICT,
          address: "123 Admin Street, Uyo, Akwa Ibom",
          lga: "Uyo",
          state: "Akwa Ibom",
          passwordHash,
          profileImage: "https://example.com/images/superadmin.jpg",
          complianceScore: 100,
          verificationStatus: "VERIFIED",
          isActive: true,
        },
      ],
      { session }
    );

    // Assign role to user
    await UserRole.create(
      [
        {
          userId: superAdmin._id.toString(),
          roleId: superAdminRole?._id,
          assignedBy: "SYSTEM",
          assignedAt: new Date(),
          isActive: true,
          effectiveFrom: new Date(),
          scope: {
            states: ["Akwa Ibom"],
            lgas: ["Uyo"],
            taxStations: [],
            permissions: superAdminRole?.permissions,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    logger.info("Super admin seeded successfully", {
      tin: superAdmin.tin,
      service: "auth_service",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    await session.abortTransaction();
    logger.error("Failed to seed super admin", {
      message: error.message,
      details: error.errors || error.details,
      stack: error.stack,
      service: "auth_service",
      timestamp: new Date().toISOString(),
    });
    throw error;
  } finally {
    session.endSession();
  }
}

if (require.main === module) {
  seedSuperAdmin().catch((error) => {
    logger.error("Seeding failed", {
      message: error.message,
      stack: error.stack,
      service: "auth_service",
    });
    process.exit(1);
  });
}
