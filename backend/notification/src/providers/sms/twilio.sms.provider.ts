import twilio               from "twilio";
import { ISmsProvider, SendSmsOptions } from "./sms.provider.interface";
import logger               from "../../utils/logger";
import { SERVICE_NAME }     from "../../constants";

export class TwilioSmsProvider implements ISmsProvider {
  private readonly client: ReturnType<typeof twilio>;
  private readonly fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.SMS_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        "Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SMS_FROM_NUMBER"
      );
    }

    this.client     = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async sendSms(options: SendSmsOptions): Promise<void> {
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