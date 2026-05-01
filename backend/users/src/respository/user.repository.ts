import mongoose from "mongoose";
import User from "../models/User";
import { UserResponseDTO } from "../types";

export class UserRepository {
  findUserByEmail = async (
    email: string,
  ): Promise<Partial<UserResponseDTO> | null> => {
    return await User.findOne({ email }).select("-passwordHash");
  };

  findUserById = async (
    _id: string,
  ): Promise<Partial<UserResponseDTO> | null> => {
    return await User.findById(_id).select("-passwordHash");
  };

  findAllUsers = async (
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<Partial<UserResponseDTO>[]> => {
    return await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-passwordHash")
      .lean();
  };

  countAllUsers = async (
    filter: Record<string, unknown>,
  ): Promise<number> => {
    return await User.countDocuments(filter);
  };

  /**
   * Optimistic concurrency update using __v as the version guard.
   * If __v on the document has changed since the caller last read it,
   * findOneAndUpdate returns null and the service throws 409.
   */
  updateUser = async (
    _id: string,
    dto: Record<string, unknown>,
    currentVersion: number,
    session?: mongoose.ClientSession,
  ): Promise<Partial<UserResponseDTO> | null> => {
    return await User.findOneAndUpdate(
      { _id, __v: currentVersion },
      {
        $set: { ...dto },
        $inc: { __v: 1 },
      },
      { new: true, session },
    ).select("-passwordHash");
  };

  deleteUser = async (
    _id: string,
    currentVersion: number,
    session?: mongoose.ClientSession,
  ): Promise<Partial<UserResponseDTO> | null> => {
    return await User.findOneAndDelete(
      { _id, __v: currentVersion },
      { session },
    ).select("-passwordHash");
  };

  /**
   * Single $facet aggregation returning all breakdown dimensions in one
   * round trip instead of four separate count queries.
   */
  aggregateUsers = async (): Promise<Record<string, unknown>[]> => {
    return await User.aggregate([
      {
        $facet: {
          byUserType: [
            { $group: { _id: "$userType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byTenantStatus: [
            { $group: { _id: "$tenantStatus", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byTenantPlan: [
            { $group: { _id: "$tenantPlan", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                verifiedUsers: { $sum: { $cond: ["$isEmailVerified", 1, 0] } },
                archivedUsers: { $sum: { $cond: ["$isArchived", 1, 0] } },
              },
            },
          ],
        },
      },
    ]);
  };
}

export const userRepository = new UserRepository();