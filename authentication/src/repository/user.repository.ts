import User, { IUser } from "../models/User";
import { PasswordResetToken } from "../models/ResetPassword";
import { ClientSession, FilterQuery } from "mongoose";

export const userRepository = {
  async findByEmail(
    email: string,
    select?: string,
    session?: ClientSession
  ): Promise<IUser | null> {
    const query = User.findOne({ email });
    if (select) query.select(select);
    if (session) query.session(session);
    return query.lean();
  },

  async findById(
    id: string,
    select?: string
  ): Promise<IUser | null> {
    const query = User.findById(id);
    if (select) query.select(select);
    return query.lean();
  },

  async create(
    data: Partial<IUser>[],
    session: ClientSession
  ): Promise<IUser[]> {
    return User.create(data, { session });
  },

  async updateById(
    id: string,
    update: Partial<IUser>,
    session?: ClientSession
  ): Promise<IUser | null> {
    const query = User.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (session) query.session(session);
    return query.lean();
  },

  async updateByEmail(
    email: string,
    update: Partial<IUser>
  ): Promise<void> {
    await User.updateOne({ email }, { $set: update });
  },

  async deleteByEmail(email: string): Promise<void> {
    await User.findOneAndDelete({ email });
  },

  async saveUser(user: IUser): Promise<IUser> {
    return user.save();
  },
};

export const passwordResetRepository = {
  async findByToken(token: string) {
    return PasswordResetToken.findOne({ token });
  },

  async deleteById(id: string): Promise<void> {
    await PasswordResetToken.findByIdAndDelete(id);
  },
};