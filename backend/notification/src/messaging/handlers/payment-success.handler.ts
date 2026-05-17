import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import { paymentSuccessTemplate }  from "../../templates/payment-success.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface PaymentSuccessEvent {
  email:         string;
  customerName:  string;
  orderId:       string;
  amount:        number;
  currency:      string;
  transactionId: string;
  sagaId:        string;
  receiptUrl?:   string;
}

export class PaymentSuccessHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_PAYMENT_SUCCESS;

  protected idempotencyKey(data: unknown): string {
    const d = data as PaymentSuccessEvent;
    return `notification:${this.routingKey}:${d.sagaId}`;
  }

  protected async handle(data: unknown): Promise<void> {
    const event = data as PaymentSuccessEvent;
    const { email, customerName, orderId, amount, currency, transactionId, receiptUrl } = event;

    const { subject, html } = paymentSuccessTemplate({
      customerName,
      orderId,
      amount,
      currency,
      transactionId,
      receiptUrl,
    });

    const notification = await notificationRepository.create({
      type:           NotificationType.PAYMENT_SUCCESS,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Payment success notification sent to ${email}`,
      metadata:       { orderId, transactionId, amount, currency },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const paymentSuccessHandler = new PaymentSuccessHandler();