import mongoose, { Document, Schema, Types } from "mongoose";

export enum NotificationType {
  CART_REMINDER = "CART_REMINDER",
  LOW_STOCK_ALERT = "LOW_STOCK_ALERT",
  ORDER_CONFIRMATION = "ORDER_CONFIRMATION",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  STORE_ONBOARDING = "STORE_ONBOARDING",
  USER_ONBOARDING = "USER_ONBOARDING",
  PASSWORD_RESET = "PASSWORD_RESET",
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
}

export enum NotificationChannel {
  EMAIL = "email",
  SMS = "sms",
}

export interface INotification extends Document {
  _id: any;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientId?: Types.ObjectId;
  storeId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  inventoryId?: Types.ObjectId;
  subject: string;
  message: string;
  metadata: Record<string, any>;
  jobId?: string;
  tenantId?: string;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
    },
    recipientEmail: { type: String },
    recipientPhone: { type: String },
    recipientId: { type: Schema.Types.ObjectId },
    storeId: { type: Schema.Types.ObjectId },
    orderId: { type: Schema.Types.ObjectId },
    inventoryId: { type: Schema.Types.ObjectId },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    jobId: { type: String },
    tenantId: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ storeId: 1, createdAt: -1 });
NotificationSchema.index({ jobId: 1 });
NotificationSchema.index({ tenantId: 1 });

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);