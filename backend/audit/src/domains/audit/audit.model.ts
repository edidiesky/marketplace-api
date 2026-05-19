import mongoose, { Schema, Document, Types } from "mongoose";

export enum AuditAction {
  USER_REGISTERED      = "user.registered",
  USER_LOGIN           = "user.login",
  USER_LOGOUT          = "user.logout",
  USER_PASSWORD_RESET  = "user.password.reset",
  ORGANIZATION_CREATED = "organization.created",
  ORGANIZATION_UPDATED = "organization.updated",
  STORE_CREATED        = "store.created",
  STORE_UPDATED        = "store.updated",
  STORE_STATUS_CHANGED = "store.status.changed",
  ORDER_CREATED        = "order.created",
  ORDER_COMPLETED      = "order.completed",
  ORDER_FAILED         = "order.failed",
  ORDER_ABANDONED      = "order.abandoned",
  PAYMENT_COMPLETED    = "payment.completed",
  PAYMENT_FAILED       = "payment.failed",
  PAYMENT_REFUNDED     = "payment.refunded",
  INVENTORY_RESERVATION_FAILED = "inventory.reservation.failed",
  REVIEW_CREATED       = "review.created",
  REVIEW_APPROVED      = "review.approved",
  REVIEW_REJECTED      = "review.rejected",
  PAYOUT_REQUESTED     = "payout.requested",
  PAYOUT_APPROVED      = "payout.approved",
  PAYOUT_REJECTED      = "payout.rejected",
}

export enum AuditSeverity {
  INFO     = "info",
  WARNING  = "warning",
  CRITICAL = "critical",
}

export enum AuditSource {
  AUTHENTICATION = "authentication",
  ORGANIZATION   = "organization",
  STORES         = "stores",
  ORDERS         = "orders",
  PAYMENT        = "payment",
  INVENTORY      = "inventory",
  REVIEW         = "review",
  NOTIFICATION   = "notification",
}

export interface IAuditLog extends Document {
  _id:          Types.ObjectId;
  action:       AuditAction;
  source:       AuditSource;
  severity:     AuditSeverity;
  actorId?:     string;
  actorType?:   string;
  resourceId?:  string;
  resourceType?: string;
  storeId?:     string;
  sagaId?:      string;
  requestId?:   string;
  payload:      Record<string, unknown>;
  createdAt:    Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type:     String,
      enum:     Object.values(AuditAction),
      required: true,
      index:    true,
    },
    source: {
      type:     String,
      enum:     Object.values(AuditSource),
      required: true,
      index:    true,
    },
    severity: {
      type:    String,
      enum:    Object.values(AuditSeverity),
      default: AuditSeverity.INFO,
      index:   true,
    },
    actorId:      { type: String, index: true },
    actorType:    { type: String },
    resourceId:   { type: String, index: true },
    resourceType: { type: String },
    storeId:      { type: String, index: true },
    sagaId:       { type: String, index: true },
    requestId:    { type: String },
    payload:      { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps:  { createdAt: true, updatedAt: false },
    versionKey:  false,
  }
);

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ storeId: 1, createdAt: -1 });
AuditLogSchema.index({ source: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ sagaId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);