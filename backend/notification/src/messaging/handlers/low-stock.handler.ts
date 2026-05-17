import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import { lowStockTemplate }        from "../../templates/low-stock.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface LowStockEvent {
  email:             string;
  sellerName:        string;
  inventoryId:       string;
  storeId:           string;
  productName:       string;
  quantityAvailable: number;
  reorderPoint:      number;
  notificationId:    string;
}

export class LowStockHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_LOW_STOCK;

  protected async handle(data: unknown): Promise<void> {
    const event = data as LowStockEvent;
    const {
      email,
      inventoryId,
      storeId,
      productName,
      quantityAvailable,
      reorderPoint,
    } = event;

    const { subject, html } = lowStockTemplate({
      inventoryId,
      storeId,
      productName,
      quantityAvailable,
      reorderPoint,
    });

    const notification = await notificationRepository.create({
      type:           NotificationType.LOW_STOCK_ALERT,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Low stock alert sent to ${email}`,
      metadata:       { inventoryId, storeId, productName, quantityAvailable, reorderPoint },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const lowStockHandler = new LowStockHandler();