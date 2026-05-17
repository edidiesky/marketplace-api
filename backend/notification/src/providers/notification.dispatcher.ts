import { IEmailProvider }   from "./email/email.provider.interface";
import { ISmsProvider }     from "./sms/sms.provider.interface";
import logger               from "../utils/logger";
import { SERVICE_NAME }     from "../constants";

export class NotificationDispatcher {
  constructor(
    private readonly emailProvider: IEmailProvider,
    private readonly smsProvider:   ISmsProvider
  ) {}

  async sendEmail(
    to:      string,
    subject: string,
    html:    string
  ): Promise<void> {
    await this.emailProvider.sendEmail({ to, subject, html });
  }

  async sendSms(to: string, message: string): Promise<void> {
    await this.smsProvider.sendSms({ to, message });
  }
}

let _dispatcher: NotificationDispatcher | null = null;

export function getDispatcher(): NotificationDispatcher {
  if (!_dispatcher) {
    throw new Error(
      "NotificationDispatcher not initialized. Call initDispatcher() first."
    );
  }
  return _dispatcher;
}

export function initDispatcher(dispatcher: NotificationDispatcher): void {
  _dispatcher = dispatcher;
  logger.info("notification_dispatcher_initialized", {
    event:   "notification_dispatcher_initialized",
    service: SERVICE_NAME,
  });
}