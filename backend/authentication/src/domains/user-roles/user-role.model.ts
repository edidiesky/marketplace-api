import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserRole extends Document {
  _id:       Types.ObjectId;
  userId:    Types.ObjectId;
  roleId:    Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserRoleSchema = new Schema<IUserRole>(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    roleId: {
      type:     Schema.Types.ObjectId,
      ref:      "Role",
      required: true,
      index:    true,
    },
  },
  { timestamps: true }
);

UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

export default mongoose.model<IUserRole>("UserRole", UserRoleSchema);