import mongoose from "mongoose";
import { PasswordResetToken } from "../models/ResetPassword";

export const passwordResetRepository = {
  async findByToken(token: string) {
    return PasswordResetToken.findOne({ token });
  },

  async create(data: {
    token: string;
    userId: mongoose.Types.ObjectId;
    expiresAt: Date;
  }) {
    return PasswordResetToken.create(data);
  },

  async deleteById(id: string): Promise<void> {
    await PasswordResetToken.findByIdAndDelete(id);
  },
};