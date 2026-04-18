import Notification, {
  INotification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../models/Notification";
import { EmailService } from "./email.service";
import logger from "../utils/logger";
import { FilterQuery, Types } from "mongoose";

export interface CartReminderInput {
  orderId: string;
  userId: string;
  jobId?: string;
  tenantId?: string;
}

export interface LowStockAlertInput {
  inventoryId: string;
  storeId: string;
  quantityAvailable: number;
  reorderPoint: number;
  jobId?: string;
  tenantId?: string;
}

export class NotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async sendCartReminder(input: CartReminderInput): Promise<Partial<INotification>> {
    const notification = await Notification.create({
      type: NotificationType.CART_REMINDER,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
      orderId: new Types.ObjectId(input.orderId),
      recipientId: new Types.ObjectId(input.userId),
      subject: "You left something in your cart",
      message: `Your order ${input.orderId} is waiting for payment.`,
      metadata: { orderId: input.orderId, userId: input.userId },
      jobId: input.jobId,
      tenantId: input.tenantId,
    });

    try {
      await this.emailService.sendCartReminderEmail(input.orderId, input.userId);

      await Notification.findByIdAndUpdate(notification._id, {
        $set: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      logger.info("notification.cart_reminder.sent", {
        event: "notification_cart_reminder_sent",
        notificationId: notification._id,
        orderId: input.orderId,
        userId: input.userId,
        jobId: input.jobId,
      });

      return { ...notification.toObject(), status: NotificationStatus.SENT };
    } catch (error) {
      await Notification.findByIdAndUpdate(notification._id, {
        $set: {
          status: NotificationStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : String(error),
        },
      });

      logger.error("notification.cart_reminder.failed", {
        event: "notification_cart_reminder_failed",
        notificationId: notification._id,
        orderId: input.orderId,
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  async sendLowStockAlert(input: LowStockAlertInput): Promise<Partial<INotification>> {
    const notification = await Notification.create({
      type: NotificationType.LOW_STOCK_ALERT,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
      inventoryId: new Types.ObjectId(input.inventoryId),
      storeId: new Types.ObjectId(input.storeId),
      subject: "Low stock alert for your product",
      message: `Stock for inventory ${input.inventoryId} has dropped to ${input.quantityAvailable} units, below reorder point of ${input.reorderPoint}.`,
      metadata: {
        inventoryId: input.inventoryId,
        storeId: input.storeId,
        quantityAvailable: input.quantityAvailable,
        reorderPoint: input.reorderPoint,
      },
      jobId: input.jobId,
      tenantId: input.tenantId,
    });

    try {
      await this.emailService.sendLowStockAlertEmail(
        input.inventoryId,
        input.storeId,
        input.quantityAvailable,
        input.reorderPoint
      );

      await Notification.findByIdAndUpdate(notification._id, {
        $set: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      logger.info("notification.low_stock_alert.sent", {
        event: "notification_low_stock_alert_sent",
        notificationId: notification._id,
        inventoryId: input.inventoryId,
        storeId: input.storeId,
        jobId: input.jobId,
      });

      return { ...notification.toObject(), status: NotificationStatus.SENT };
    } catch (error) {
      await Notification.findByIdAndUpdate(notification._id, {
        $set: {
          status: NotificationStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : String(error),
        },
      });

      logger.error("notification.low_stock_alert.failed", {
        event: "notification_low_stock_alert_failed",
        notificationId: notification._id,
        inventoryId: input.inventoryId,
        storeId: input.storeId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
    
  }

  CreateNotificationService = (
  user: string,
  store: string,
  body: Partial<INotification>
): Promise<INotification> => {
  return Notification.create({
    ...body,
    recipientId: new Types.ObjectId(user),
    storeId: new Types.ObjectId(store),
    type: body.type ?? NotificationType.ORDER_CONFIRMATION,
    channel: NotificationChannel.EMAIL,
    subject: body.subject ?? "Notification",
    message: body.message ?? "",
  });
};

GetAllStoreNotificationService = (
  query: FilterQuery<INotification>,
  skip: number,
  limit: number
): Promise<INotification[]> =>
  Notification.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec();

GetASingleNotificationService = (
  id: string
): Promise<INotification | null> =>
  Notification.findById(id).lean().exec();

UpdateNotificationService = (
  id: string,
  body: Partial<INotification>
): Promise<INotification | null> =>
  Notification.findByIdAndUpdate(id, { $set: body }, { new: true }).exec();

DeleteNotificationService = async (
  id: string
): Promise<string> => {
  await Notification.findByIdAndDelete(id).exec();
  return "Notification has been deleted";
};
}

export const notificationService = new NotificationService();