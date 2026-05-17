import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import { passwordResetTemplate }   from "../../templates/password-reset.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface PasswordResetEvent {
  email:          string;
  firstName:      string;
  resetUrl:       string;
  notificationId: string;
}

export class PasswordResetHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_RESET_PASSWORD;

  protected async handle(data: unknown): Promise<void> {
    const event = data as PasswordResetEvent;
    const { email, firstName, resetUrl } = event;

    const { subject, html } = passwordResetTemplate({ firstName, resetUrl });

    const notification = await notificationRepository.create({
      type:           NotificationType.PASSWORD_RESET,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Password reset sent to ${email}`,
      metadata:       { resetUrl },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const passwordResetHandler = new PasswordResetHandler();