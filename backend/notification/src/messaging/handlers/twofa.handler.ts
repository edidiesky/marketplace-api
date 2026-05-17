import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import {
  twoFATemplate,
  twoFASmsMessage,
} from "../../templates/twofa.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface TwoFAEvent {
  email:          string;
  phone?:         string;
  fullName:       string;
  token:          string;
  notificationId: string;
}

export class TwoFAHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_2FA;

  protected async handle(data: unknown): Promise<void> {
    const event = data as TwoFAEvent;
    const { email, phone, fullName, token } = event;

    const { subject, html } = twoFATemplate({ fullName, token });

    const notification = await notificationRepository.create({
      type:           NotificationType.USER_ONBOARDING,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      recipientPhone: phone,
      subject,
      message:        `2FA code sent to ${email}`,
      metadata:       { token },
    });

    await getDispatcher().sendEmail(email, subject, html);

    if (phone) {
      await getDispatcher().sendSms(phone, twoFASmsMessage(token));
    }

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const twoFAHandler = new TwoFAHandler();