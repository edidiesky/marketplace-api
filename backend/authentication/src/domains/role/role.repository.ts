import Role, { IRole } from "./role.model";
import { UserType }    from "../auth/auth.model";

export const roleRepository = {
  async findByUserType(userType: UserType): Promise<IRole[]> {
    return Role.find({ userType, isActive: true }).lean<IRole[]>().exec();
  },

  async findById(id: string): Promise<IRole | null> {
    return Role.findById(id).lean<IRole>().exec();
  },

  async findByName(name: string): Promise<IRole | null> {
    return Role.findOne({ name }).lean<IRole>().exec();
  },

  async create(data: Partial<IRole>): Promise<IRole> {
    const [role] = await Role.create([data]);
    return role;
  },

  async findAll(): Promise<IRole[]> {
    return Role.find({ isActive: true })
      .sort({ userType: 1, name: 1 })
      .lean<IRole[]>()
      .exec();
  },
};