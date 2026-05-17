import { ClientSession } from "mongoose";
import User, { IUser } from "./auth.model";

export const userRepository = {
  async findByEmail(
    email:    string,
    select?:  string,
    session?: ClientSession
  ): Promise<IUser | null> {
    const query = User.findOne({ email: email.toLowerCase().trim() });
    if (select)  query.select(select);
    if (session) query.session(session);
    return query.lean();
  },

  async findById(
    id:       string,
    select?:  string,
    session?: ClientSession
  ): Promise<IUser | null> {
    const query = User.findById(id);
    if (select)  query.select(select);
    if (session) query.session(session);
    return query.lean();
  },

  async create(
    data:     Partial<IUser>[],
    session?: ClientSession
  ): Promise<IUser[]> {
    const options = session ? { session } : {};
    return User.create(data, options) as unknown as Promise<IUser[]>;
  },

  async updateById(
    id:       string,
    update:   Partial<IUser>,
    session?: ClientSession
  ): Promise<IUser | null> {
    const query = User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );
    if (session) query.session(session);
    return query.lean();
  },

  async updateByEmail(
    email:  string,
    update: Partial<IUser>
  ): Promise<void> {
    await User.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: update }
    );
  },

  async deleteByEmail(email: string): Promise<void> {
    await User.findOneAndDelete({
      email: email.toLowerCase().trim(),
    });
  },
};