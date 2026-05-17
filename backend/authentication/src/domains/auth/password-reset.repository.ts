import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPasswordResetToken extends Document {
  _id:       Types.ObjectId;
  token:     string;
  userId:    Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    token:     {
      type:   String,
      required: true,
      unique: true,
      index:  true,
    },
    userId:    {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    expiresAt: {
      type:     Date,
      required: true,
      index:    { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

const PasswordResetToken = mongoose.model<IPasswordResetToken>(
  "PasswordResetToken",
  PasswordResetTokenSchema
);

export const passwordResetRepository = {
  async create(data: {
    token:     string;
    userId:    Types.ObjectId;
    expiresAt: Date;
  }): Promise<IPasswordResetToken> {
    return PasswordResetToken.create(data);
  },

  async findByToken(token: string): Promise<IPasswordResetToken | null> {
    return PasswordResetToken.findOne({ token });
  },

  async deleteById(id: string): Promise<void> {
    await PasswordResetToken.findByIdAndDelete(id);
  },
};