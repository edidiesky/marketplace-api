import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Role, UserRole, IRole, IUserRole } from "../models/Role";
import User, { Permission, RoleLevel, UserType } from "../models/User";
import logger from "../utils/logger";
import {
  BAD_REQUEST_STATUS_CODE,
  NOT_FOUND_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  UNAUTHORIZED_STATUS_CODE,
  USER_PROFILE_UPDATE,
} from "../constants";
import { AuthenticatedRequest } from "../types";
import { getSingleTINFromPool } from "../utils/generateTIN";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis";

/**
 * @description Create a new role
 * @route POST /api/v1/roles
 * @access Protected (Super Admin, ICT Admin)
 */
export const CreateRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        roleCode,
        roleName,
        directorate,
        level,
        permissions,
        description,
        parentRole,
      } = req.body;

      // Check if role already exists
      const existingRole = await Role.findOne({ roleCode }).session(session);
      if (existingRole) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(`Role with code ${roleCode} already exists`);
      }

      // Validate parent role if provided
      let parentRoleDoc = null;

      const roleData: Partial<IRole> = {
        roleCode: roleCode.toUpperCase(),
        roleName,
        directorate,
        level,
        permissions: permissions,
        description,
        parentRole: parentRole || undefined,
        childRoles: [],
        createdBy: req.user!.userId,
        updatedBy: req.user!.userId,
        isActive: true,
      };

      const [newRole] = await Role.create([roleData], { session });

      // Update parent role to include this as a child
      if (parentRoleDoc) {
        await Role.findByIdAndUpdate(
          parentRole,
          { $push: { childRoles: newRole._id } },
          { session }
        );
      }

      await session.commitTransaction();

      logger.info("Role created successfully", {
        roleCode,
        createdBy: req.user!.userId,
        directorate,
        level,
      });

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        message: "Role created successfully",
        data: newRole,
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error("Role creation failed", { error: error.message });
      res.status(error.statusCode || BAD_REQUEST_STATUS_CODE).json({
        message: error.message,
        status: "error",
      });
    } finally {
      await session.endSession();
    }
  }
);

/**
 * @description Assign role to user
 * @route POST /api/v1/roles/assign-role
 * @access Protected (MANAGE_ROLES permission, DEPUTY_DIRECTOR level)
 */
export const AssignRoleToUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const user = (req as AuthenticatedRequest).user;
    const { roleLevel } = user;

    try {
      const { userId, roleCode, scope, effectiveFrom, effectiveTo, reason } =
        req.body;

      const user = await User.findOne({ tin: userId }).session(session);
      if (!user) {
        res.status(NOT_FOUND_STATUS_CODE);
        throw new Error("User not found");
      }

      const role = await Role.findOne({ roleCode, isActive: true }).session(
        session
      );
      if (!role) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(`Role ${roleCode} not found or inactive`);
      }

      // Check if user already has this role
      const existingUserRole = await UserRole.findOne({
        userId,
        roleId: role._id,
        isActive: true,
      }).session(session);

      if (existingUserRole) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("User already has this role assigned");
      }

      // Validate requester's permissions against role level
      if (roleLevel && role.level <= roleLevel) {
        res.status(UNAUTHORIZED_STATUS_CODE);
        throw new Error(
          "Cannot assign a role with equal or higher level than your own"
        );
      }

      const userRoleData: Partial<IUserRole> = {
        userId,
        roleId: role._id,
        assignedBy: req.user?.userId || "SYSTEM",
        assignedAt: new Date(),
        isActive: true,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        scope: scope || {},
        reason,
      };

      await UserRole.create([userRoleData], { session });

      //   await sendUserMessage(ROLE_ASSIGNMENT_TOPIC, {
      //     userId,
      //     roleCode,
      //     assignedBy: req.user?.userId,
      //     directorate: role.directorate,
      //     assignedAt: new Date(),
      //   });

      await session.commitTransaction();
      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        message: "Role assigned successfully",
        data: {
          userId,
          roleCode,
          directorate: role.directorate,
          scope,
        },
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error("Role assignment failed", { error: error.message });
      res.status(error.statusCode || 500).json({
        message: error.message,
        status: "error",
      });
    } finally {
      await session.endSession();
    }
  }
);

/**
 * @description Revoke user role
 * @route DELETE /api/v1/roles/revoke-role/:userId/:roleId
 * @access Protected (MANAGE_ROLES permission, DEPUTY_DIRECTOR level)
 */
export const RevokeUserRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const user = (req as AuthenticatedRequest).user;
    const { roleLevel, userId } = user;

    try {
      const { roleId } = req.body;

      const user = await User.findOne({ tin: userId }).session(session);
      if (!user) {
        res.status(NOT_FOUND_STATUS_CODE);
        throw new Error("User not found");
      }

      const role = await Role.findById(roleId).session(session);
      if (!role) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("Role not found");
      }

      const userRole = await UserRole.findOne({
        userId,
        roleId,
        isActive: true,
      }).session(session);

      if (!userRole) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("User does not have this role assigned");
      }

      // Validate requester's permissions against role level
      if (roleLevel && role.level <= roleLevel) {
        res.status(UNAUTHORIZED_STATUS_CODE);
        throw new Error(
          "Cannot revoke a role with equal or higher level than your own"
        );
      }

      await UserRole.updateOne(
        { _id: userRole._id },
        { $set: { isActive: false, effectiveTo: new Date() } },
        { session }
      );

      //   await sendUserMessage(ROLE_ASSIGNMENT_TOPIC, {
      //     userId,
      //     roleCode: role.roleCode,
      //     assignedBy: req.user?.userId,
      //     directorate: role.directorate,
      //     action: "revoked",
      //     revokedAt: new Date(),
      //   });

      await session.commitTransaction();
      res.status(200).json({
        message: "Role revoked successfully",
        data: { userId, roleCode: role.roleCode },
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error("Role revocation failed", { error: error.message });
      res.status(error.statusCode || 500).json({
        message: error.message,
        status: "error",
      });
    } finally {
      await session.endSession();
    }
  }
);

/**
 * @description Update user role (scope, effective dates, etc.)
 * @route PUT /api/v1/roles/update-role
 * @access Protected (MANAGE_ROLES permission, DEPUTY_DIRECTOR level)
 */
export const UpdateUserRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const {
      roleLevel,
      userId: adminId,
      name,
    } = (req as AuthenticatedRequest).user;

    try {
      const {
        firstName,
        lastName,
        userId,
        roleCode,
        scope,
        effectiveFrom,
        effectiveTo,
        lgaOfResidence,
        phone,
        nin,
        address,
        email,
      } = req.body;

      const user = await User.findOne({ tin: userId }).session(session);
      if (!user) {
        res.status(NOT_FOUND_STATUS_CODE);
        throw new Error("User not found");
      }

      const role = await Role.findOne({ roleCode, isActive: true }).session(
        session
      );
      if (!role) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(`Role ${roleCode} not found or inactive`);
      }

      const userRole = await UserRole.findOne({
        userId,
        isActive: true,
      }).session(session);

      if (!userRole) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("User does not have this role assigned");
      }

      // Validate requester's permissions against role level
      if (roleLevel && role.level <= roleLevel) {
        res.status(UNAUTHORIZED_STATUS_CODE);
        throw new Error(
          "Cannot update a role with equal or higher level than your own"
        );
      }

      const updateData: Partial<IUserRole> = {
        scope: scope || userRole.scope,
        effectiveFrom: effectiveFrom
          ? new Date(effectiveFrom)
          : userRole.effectiveFrom,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : userRole.effectiveTo,
        updatedAt: new Date(),
      };

      await UserRole.updateOne(
        { _id: userRole._id },
        { $set: updateData },
        { session }
      );

      await User.updateOne(
        { tin: userId },
        {
          $set: {
            firstName,
            lastName,
            lgaOfResidence,
            phone,
            nin,
            address,
            email,
          },
        },
        { session }
      );

      await session.commitTransaction();
      const userRedisPattern = `redis:user:*`;
      const userRedisKeys = await redisClient.keys(userRedisPattern);
      if (userRedisKeys.length > 0) {
        await redisClient.del(userRedisKeys);
        logger.info("User cache invalidated", {
          userRedisKeys,
        });
      }

      // await sendUserMessage(USER_PROFILE_UPDATE, {
      //   userId,
      //   updatedFields: updateData,
      //   updatedBy: name,
      // });

      res.status(200).json({
        message: "Role updated successfully",
        data: { userId, roleCode, scope: updateData.scope },
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error("Role update failed", { error: error.message });
      res.status(error.statusCode || 500).json({
        message: error.message,
        status: "error",
      });
    } finally {
      await session.endSession();
    }
  }
);

/**
 * @description Get all roles assigned to a user
 * @route GET /api/v1/roles/user-roles/:userId
 * @access Protected (READ_USER permission)
 */
export const GetUserRoles = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const user = await User.findOne({ tin: userId });
      if (!user) {
        res.status(NOT_FOUND_STATUS_CODE);
        throw new Error("User not found");
      }

      const userRoles = await UserRole.find({
        userId,
        isActive: true,
        effectiveFrom: { $lte: new Date() },
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: { $gte: new Date() } },
        ],
      }).populate<{ roleId: IRole }>("roleId");

      const roles = userRoles.map((ur) => ({
        roleCode: ur.roleId.roleCode,
        roleName: ur.roleId.roleName,
        directorate: ur.roleId.directorate,
        level: ur.roleId.level,
        permissions: ur.roleId.permissions,
        scope: ur.scope,
        effectiveFrom: ur.effectiveFrom,
        effectiveTo: ur.effectiveTo,
      }));

      res.status(200).json({
        message: "User roles retrieved successfully",
        data: roles,
        status: "success",
      });
    } catch (error: any) {
      logger.error("Failed to retrieve user roles", { error: error.message });
      res.status(error.statusCode || 500).json({
        message: error.message,
        status: "error",
      });
    }
  }
);

/**
 * @description Get all available roles for assignment
 * @route GET /api/v1/roles/available-roles
 * @access Protected (MANAGE_ROLES permission)
 */
export const GetAvailableRoles = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    const { roleLevel } = user;
    try {
      const roles = await Role.find({
        isActive: true,
        level: { $gt: roleLevel || RoleLevel.MEMBER },
      }).select("roleCode roleName directorate level permissions description");

      res.status(200).json({
        message: "Available roles retrieved successfully",
        data: roles,
        status: "success",
      });
    } catch (error: any) {
      logger.error("Failed to retrieve available roles", {
        error: error.message,
      });
      res.status(error.statusCode || 500).json({
        message: error.message,
        status: "error",
      });
    }
  }
);

export const seedSuperAdmin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if super admin exists

      // Check if SUPER_ADMIN role exists
      let superAdminRole = await Role.findOne({
        roleCode: "SUPER_ADMIN",
      }).session(session);
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash("Mcgarvey1000@", salt);
      if (!superAdminRole) {
        const [newsuperAdminRole] = await Role.create(
          [
            {
              roleCode: "SUPER_ADMIN",
              roleName: "Super Administrator",
              level: RoleLevel.SUPER_ADMIN,
              permissions: [Permission.CREATE_USER],
              description: "Full system access",
              createdBy: "SYSTEM",
              updatedBy: "SYSTEM",
              isActive: true,
            },
          ],
          { session }
        );
        superAdminRole = newsuperAdminRole;
      }

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
        roleCode: superAdminRole.roleCode,
        service: "auth_service",
        timestamp: new Date().toISOString(),
      });
      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        data: superAdmin,
        message: "Super admin seeded successfully",
        success: true,
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
);
