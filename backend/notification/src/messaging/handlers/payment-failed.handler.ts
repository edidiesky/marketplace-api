import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import { paymentFailedTemplate }   from "../../templates/payment-failed.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface PaymentFailedEvent {
  email:        string;
  customerName: string;
  orderId:      string;
  reason?:      string;
  sagaId:       string;
  storeId:      string;
}

export class PaymentFailedHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_PAYMENT_FAILED;

  protected idempotencyKey(data: unknown): string {
    const d = data as PaymentFailedEvent;
    return `notification:${this.routingKey}:${d.sagaId}`;
  }

  protected async handle(data: unknown): Promise<void> {
    const event = data as PaymentFailedEvent;
    const { email, customerName, orderId, reason, storeId } = event;

    const retryUrl = `${process.env.WEB_ORIGIN}/store/${storeId}/order/${orderId}/payment`;

    const { subject, html } = paymentFailedTemplate({
      customerName,
      orderId,
      reason,
      retryUrl,
    });

    const notification = await notificationRepository.create({
      type:           NotificationType.PAYMENT_FAILED,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Payment failed notification sent to ${email}`,
      metadata:       { orderId, reason },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const paymentFailedHandler = new PaymentFailedHandler();