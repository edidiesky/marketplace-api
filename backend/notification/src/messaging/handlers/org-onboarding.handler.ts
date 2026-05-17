import { BaseNotificationHandler } from "./base.handler";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { notificationRepository }  from "../../domains/notification/notification.repository";
import { orgOnboardingTemplate }   from "../../templates/org-onboarding.template";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../../domains/notification/notification.model";
import { ROUTING_KEYS }            from "../../constants";

interface OrgOnboardingEvent {
  email:          string;
  firstName:      string;
  lastName:       string;
  plan:           string;
  notificationId: string;
}

export class OrgOnboardingHandler extends BaseNotificationHandler {
  protected routingKey = ROUTING_KEYS.NOTIFICATION_ORG_ONBOARDING;

  protected async handle(data: unknown): Promise<void> {
    const event = data as OrgOnboardingEvent;
    const { email, firstName, lastName, plan } = event;

    const { subject, html } = orgOnboardingTemplate({ firstName, lastName, plan });

    const notification = await notificationRepository.create({
      type:           NotificationType.USER_ONBOARDING,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      subject,
      message:        `Organization onboarding email sent to ${email}`,
      metadata:       { plan },
    });

    await getDispatcher().sendEmail(email, subject, html);

    await notificationRepository.markSent(notification._id.toString());
  }
}

export const orgOnboardingHandler = new OrgOnboardingHandler();