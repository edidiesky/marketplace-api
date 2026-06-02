import RolePermission, { IRolePermission } from "./role-permission.model";
import { Types }                           from "mongoose";

export const rolePermissionRepository = {
  async findByRoleIds(
    roleIds: Types.ObjectId[]
  ): Promise<IRolePermission[]> {
    return RolePermission.find({
      roleId:  { $in: roleIds },
      granted: true,
    })
      .populate("permissionId")
      .lean<IRolePermission[]>()
      .exec();
  },

  async assignPermissionToRole(
    roleId:       string,
    permissionId: string
  ): Promise<IRolePermission> {
    const existing = await RolePermission.findOne({
      roleId:      new Types.ObjectId(roleId),
      permissionId: new Types.ObjectId(permissionId),
    });

    if (existing) return existing;

    const [rp] = await RolePermission.create([{
      roleId:       new Types.ObjectId(roleId),
      permissionId: new Types.ObjectId(permissionId),
      granted:      true,
    }]);
    return rp;
  },

  async revokePermissionFromRole(
    roleId:       string,
    permissionId: string
  ): Promise<void> {
    await RolePermission.deleteOne({
      roleId:       new Types.ObjectId(roleId),
      permissionId: new Types.ObjectId(permissionId),
    });
  },

  async findByRoleId(roleId: string): Promise<IRolePermission[]> {
    return RolePermission.find({
      roleId: new Types.ObjectId(roleId),
    })
      .populate("permissionId")
      .lean<IRolePermission[]>()
      .exec();
  },
};