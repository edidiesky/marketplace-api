import { Resend }           from "resend";
import { IEmailProvider, SendEmailOptions } from "./email.provider.interface";
import logger               from "../../utils/logger";
import { SERVICE_NAME }     from "../../constants";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Selleasi <no-reply@selleasi.com>";

export class ResendEmailProvider implements IEmailProvider {
  private readonly client: Resend;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY env var is not set");
    }
    this.client = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, subject, html } = options;

    const { error } = await this.client.emails.send({
      from:    FROM_ADDRESS,
      to:      [to],
      subject,
      html,
    });

    if (error) {
      logger.error("resend_email_failed", {
        event:   "resend_email_failed",
        service: SERVICE_NAME,
        to,
        subject,
        error:   error.message,
      });
      throw new Error(`Resend email failed: ${error.message}`);
    }

    logger.info("resend_email_sent", {
      event:   "resend_email_sent",
      service: SERVICE_NAME,
      to,
      subject,
    });
  }
}