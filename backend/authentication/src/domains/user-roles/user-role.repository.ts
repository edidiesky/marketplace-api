import UserRole, { IUserRole } from "./user-role.model";
import { Types }               from "mongoose";

export const userRoleRepository = {
  async findByUserId(userId: string): Promise<IUserRole[]> {
    return UserRole.find({ userId: new Types.ObjectId(userId) })
      .lean<IUserRole[]>()
      .exec();
  },

  async assignRoleToUser(
    userId: string,
    roleId: string
  ): Promise<IUserRole> {
    const existing = await UserRole.findOne({
      userId: new Types.ObjectId(userId),
      roleId: new Types.ObjectId(roleId),
    });

    if (existing) return existing;

    const [ur] = await UserRole.create([{
      userId: new Types.ObjectId(userId),
      roleId: new Types.ObjectId(roleId),
    }]);
    return ur;
  },

  async removeRoleFromUser(
    userId: string,
    roleId: string
  ): Promise<void> {
    await UserRole.deleteOne({
      userId: new Types.ObjectId(userId),
      roleId: new Types.ObjectId(roleId),
    });
  },

  async removeAllRolesFromUser(userId: string): Promise<void> {
    await UserRole.deleteMany({ userId: new Types.ObjectId(userId) });
  },
};