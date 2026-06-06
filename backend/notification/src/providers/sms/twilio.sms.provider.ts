import twilio               from "twilio";
import { ISmsProvider, SendSmsOptions } from "./sms.provider.interface";
import logger               from "../../utils/logger";
import { SERVICE_NAME }     from "../../constants";

export class TwilioSmsProvider implements ISmsProvider {
  private readonly client:     ReturnType<typeof twilio> | null;
  private readonly fromNumber: string | null;
  private readonly configured: boolean;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.SMS_FROM_NUMBER;

    this.configured = !!(accountSid && authToken && fromNumber);

    if (!this.configured) {
      this.client     = null;
      this.fromNumber = null;
      logger.warn("sms_provider_disabled", {
        event:   "sms_provider_disabled",
        service: SERVICE_NAME,
        reason:  "Twilio env vars not configured, SMS will be silently skipped",
      });
      return;
    }

    this.client     = twilio(accountSid!, authToken!);
    this.fromNumber = fromNumber!;
  }

  async sendSms(options: SendSmsOptions): Promise<void> {
    if (!this.configured || !this.client || !this.fromNumber) {
      logger.warn("sms_skipped", {
        event:   "sms_skipped",
        service: SERVICE_NAME,
        reason:  "Twilio not configured",
        to:      options.to,
      });
      return;
    }

    const { to, message } = options;

    if (!to.startsWith("+") || to.length < 10) {
      throw new Error(
        `Invalid phone number format: ${to}. Use E.164 format (e.g. +2348073484652).`
      );
    }

    await this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to,
    });

    logger.info("twilio_sms_sent", {
      event:   "twilio_sms_sent",
      service: SERVICE_NAME,
      to,
    });
  }
}