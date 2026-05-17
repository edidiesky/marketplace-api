import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import { orderCompletedTemplate }  from "../../templates/order-completed.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface OrderCompletedEvent {
  email:        string;
  customerName: string;
  orderId:      string;
  storeId:      string;
  sagaId:       string;
  receiptUrl?:  string;
}

export class OrderCompletedHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_ORDER_COMPLETED;

  protected idempotencyKey(data: unknown): string {
    const d = data as OrderCompletedEvent;
    return `notification:${this.routingKey}:${d.sagaId}`;
  }

  protected async handle(data: unknown): Promise<void> {
    const event = data as OrderCompletedEvent;
    const { email, customerName, orderId, storeId, receiptUrl } = event;

    const { subject, html } = orderCompletedTemplate({
      customerName,
      orderId,
      storeId,
      receiptUrl,
    });

    const notification = await notificationRepository.create({
      type:           NotificationType.ORDER_CONFIRMATION,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Order confirmation sent to ${email}`,
      metadata:       { orderId, storeId, receiptUrl },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const orderCompletedHandler = new OrderCompletedHandler();