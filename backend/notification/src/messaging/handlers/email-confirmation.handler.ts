import { BaseNotificationHandler }     from "./base.handler";
import { getDispatcher }               from "../../providers/notification.dispatcher";
import { notificationRepository }      from "../../domains/notification/notification.repository";
import { emailConfirmationTemplate }   from "../../templates/email-confirmation.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }                from "../../constants";

interface EmailConfirmationEvent {
  email:           string;
  firstName:       string;
  lastName:        string;
  notificationId:  string;
  verificationUrl: string;
}

export class EmailConfirmationHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_EMAIL_CONFIRMATION;

  protected async handle(data: unknown): Promise<void> {
    const event = data as EmailConfirmationEvent;
    const { email, firstName, lastName, verificationUrl } = event;

    const { subject, html } = emailConfirmationTemplate({
      firstName,
      lastName,
      verificationUrl,
    });

    const notification = await notificationRepository.create({
      type:           NotificationType.USER_ONBOARDING,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Email confirmation sent to ${email}`,
      metadata:       { verificationUrl },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const emailConfirmationHandler = new EmailConfirmationHandler();