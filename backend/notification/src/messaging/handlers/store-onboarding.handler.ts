import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import { storeOnboardingTemplate } from "../../templates/store-onboarding.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface StoreOnboardingEvent {
  email:          string;
  name:           string;
  storeName:      string;
  storeUrl:       string;
  plan:           string;
  notificationId: string;
}

export class StoreOnboardingHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_STORE_ONBOARDING;

  protected async handle(data: unknown): Promise<void> {
    const event = data as StoreOnboardingEvent;
    const { email, name, storeName, storeUrl, plan } = event;

    const { subject, html } = storeOnboardingTemplate({
      name,
      storeName,
      storeUrl,
      plan,
    });

    const notification = await notificationRepository.create({
      type:           NotificationType.STORE_ONBOARDING,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Store onboarding email sent to ${email}`,
      metadata:       { storeName, plan, storeUrl },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const storeOnboardingHandler = new StoreOnboardingHandler();