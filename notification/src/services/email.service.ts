import axios from "axios";
import handlebars from "handlebars";
import path from "path";
import fs from "fs";
import logger from "../utils/logger";
import twilio from "twilio";
import { MailerSend } from "mailersend";
import { IEmailResponse } from "../types";

export class EmailService {
  private readonly accountSid: any;
  private readonly authToken: any;
  private readonly smsFromNumber: any;
  private readonly twilioClient: any;
  private readonly mailerSend: MailerSend;

  constructor() {
    // Validate and initialize environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const smsFromNumber = process.env.SMS_FROM_NUMBER;
    // if (!accountSid || !authToken || !smsFromNumber) {
    //   throw new Error(
    //     "Missing required Twilio environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or SMS_FROM_NUMBER"
    //   );
    // }

    this.mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_TOKEN!,
    });

    this.smsFromNumber = smsFromNumber;
    this.twilioClient = twilio(accountSid, authToken);
  }

  async sendSMSNotification(
    recipient: string,
    message: string
  ): Promise<IEmailResponse> {
    try {
      // Validate recipient format
      if (!recipient.startsWith("+") || recipient.length < 10) {
        throw new Error(
          "Invalid recipient number. Use international format (e.g., +2348073484652)"
        );
      }
      await this.twilioClient.messages.create({
        body: message,
        from: process.env.SMS_FROM_NUMBER!,
        to: recipient,
      });

      logger.info("SMS sent successfully via Twilio", {
        recipient,
      });
      return {
        status: "success",
        message: `SMS sent successfully via Twilio to ${recipient}`,
      };
    } catch (error: any) {
      logger.error("Failed to send SMS via Twilio", {
        message: error.message,
        stack: error.stack,
        details: error.details,
      });
      throw new Error("Failed to send SMS: " + error.message);
    }
  }
  /**
   * @description Send User Onboarding Confirmation Email
   * @param recipientEmail
   * @param data
   */
  async sendUserOnboardingConfirmationEmail(
    recipientEmail: string,
    data: any
  ): Promise<void> {
    try {
      const {
        subject,
        verification_url,
        email,
        firstName,
        lastName,
        unsubscribeLink,
      } = data;
      const templatePath = path.join(
        __dirname,
        "../providers/email/templates/onboardingEmailConfirmation.html"
      );
      const source = fs.readFileSync(templatePath, "utf-8");
      const template = handlebars.compile(source);
      const html = template({
        subject,
        verification_url,
        email,
        firstName,
        lastName,
        from_name: "SellEasi",
        action_url: `${process.env.WEB_ORIGIN}/auth/signin`,
        unsubscribeLink: unsubscribeLink || "https://SellEasi.com/unsubscribe",
      });
      await axios.post(
        "https://api.mailersend.com/v1/email",
        {
          from: { email: process.env.EMAIL_FROM! },
          to: [{ email: recipientEmail }],
          subject: subject || "Welcome to SellEasi World",
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      if (error.response) {
        logger.error("Failed to send welcome email - API response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
          config: error.config,
        });
      } else {
        logger.error("Failed to send welcome email - General error:", {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  /**
   * @description Send User Store Created Email
   * @param recipientEmail
   * @param data
   */
  async sendUserStoreCreatedEmail(
    recipientEmail: string,
    data: any
  ): Promise<void> {
    try {
      const { subject, email, name, unsubscribeLink, store, plan, store_url } =
        data;
      const templatePath = path.join(
        __dirname,
        "../providers/email/templates/onboardingStoreCreated.html"
      );
      const source = fs.readFileSync(templatePath, "utf-8");
      const template = handlebars.compile(source);
      const html = template({
        subject,
        email,
        name,
        store,
        plan,
        store_url,
        from_name: "SellEasi",
        unsubscribeLink: unsubscribeLink || "https://sellEasi.com/unsubscribe",
      });
      await axios.post(
        "https://api.mailersend.com/v1/email",
        {
          from: { email: process.env.EMAIL_FROM! },
          to: [{ email: recipientEmail }],
          subject: "Store Created",
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      if (error.response) {
        logger.error("Failed to send welcome email - API response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
          config: error.config,
        });
      } else {
        logger.error("Failed to send welcome email - General error:", {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  /**
   * @description Send Verification Code Email
   * @param recipientEmail
   * @param data
   */
  async sendVerificationCodeEmail(
    recipientEmail: string,
    data: any
  ): Promise<void> {
    try {
      logger.info("Verification code email:", {
        data,
      });
      const { email, token, name, subject } = data;
      const templatePath = path.join(
        __dirname,
        "../providers/email/templates/verification-code.html"
      );
      const source = fs.readFileSync(templatePath, "utf-8");
      const template = handlebars.compile(source);
      const html = template({
        email,
        name,
        verification_code: token,
      });
      await axios.post(
        "https://api.mailersend.com/v1/email",
        {
          from: { email: process.env.EMAIL_FROM! },
          to: [{ email: recipientEmail }],
          subject: "SellEasi Account Verification Code",
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      logger.info("Verification email has been sent successfully");
    } catch (error: any) {
      if (error.response) {
        logger.error("Failed to send Verification email - API response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
          config: error.config,
        });
      } else {
        logger.error("Failed to send Verification email - General error:", {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }
}
