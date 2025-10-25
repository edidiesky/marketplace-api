import mongoose from "mongoose";
import { Role, IRole } from "../models/Role";
import logger from "../utils/logger";
import { connectMongoDB } from "../utils/connectDB";
import dotenv from "dotenv";
import { rolesData } from "../data/roleData";

dotenv.config();


async function seedRoles(clearExisting: boolean = false): Promise<void> {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    logger.error("MongoDB connection string is not defined");
    throw new Error("MongoDB connection string is not defined");
  }

  await connectMongoDB(mongoUrl);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (clearExisting) {
      await Role.deleteMany({}).session(session);
      logger.info("Cleared existing roles", { service: "auth_service", timestamp: new Date().toISOString() });
    }

    const existingRoles = await Role.find({
      roleCode: { $in: rolesData.map((r) => r.roleCode) },
    }).session(session);
    const existingRoleCodes = new Set(existingRoles.map((r) => r.roleCode));
    const rolesToInsert: Partial<IRole>[] = [];
    const rolesToUpdate: { roleCode: string; data: Partial<IRole> }[] = [];

    for (const role of rolesData) {
      const existingRole = existingRoles.find((r) => r.roleCode === role.roleCode);
      if (!existingRole) {
        rolesToInsert.push(role);
      } else {
        const hasChanges =
          existingRole.roleName !== role.roleName ||
          existingRole.directorate !== role.directorate ||
          existingRole.level !== role.level ||
          JSON.stringify(existingRole.permissions) !== JSON.stringify(role.permissions) ||
          existingRole.description !== role.description ||
          existingRole.isActive !== role.isActive ||
          String(existingRole.parentRole) !== String(role.parentRole) ||
          JSON.stringify(existingRole.childRoles) !== JSON.stringify(role.childRoles);
        
        if (hasChanges) {
          rolesToUpdate.push({ roleCode: role.roleCode!, data: role });
        }
      }
    }

    logger.debug("Seeding summary", {
      existingRoles: existingRoles.map((r) => ({
        roleCode: r.roleCode,
        permissions: r.permissions,
        level: r.level,
        directorate: r.directorate,
        isActive: r.isActive,
      })),
      rolesToInsert: rolesToInsert.map((r) => r.roleCode),
      rolesToUpdate: rolesToUpdate.map((r) => r.roleCode),
      service: "auth_service",
      timestamp: new Date().toISOString(),
    });

    let insertedRoles: IRole[] = [];
    if (rolesToInsert.length > 0) {
      insertedRoles = await Role.insertMany(rolesToInsert, { session, ordered: false });
    }

    const updatedRoles: string[] = [];
    for (const { roleCode, data } of rolesToUpdate) {
      await Role.updateOne(
        { roleCode },
        { $set: { ...data, updatedBy: "SYSTEM", updatedAt: new Date() } },
        { session }
      );
      updatedRoles.push(roleCode);
    }

    logger.info("Roles seeded successfully", {
      insertedCount: insertedRoles.length,
      insertedRoleCodes: insertedRoles.map((r) => r.roleCode),
      updatedCount: updatedRoles.length,
      updatedRoleCodes: updatedRoles,
      service: "auth_service",
      timestamp: new Date().toISOString(),
    });

    await session.commitTransaction();
  } catch (error: any) {
    if(session.inTransaction()) {
      await session.abortTransaction();
    }
    logger.error("Failed to seed roles", {
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
  seedRoles(true).catch((error) => {
    logger.error("Seeding failed", { message: error.message, stack: error.stack, service: "auth_service" });
    process.exit(1);
  });
}