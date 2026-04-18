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

  async sendCartReminderEmail(
  orderId: string,
  userId: string
): Promise<void> {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You left something behind</h2>
        <p>Your order is waiting for payment. Complete your purchase before your reservation expires.</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <a href="${process.env.WEB_ORIGIN}/orders/${orderId}/payment"
           style="background-color: #4CAF50; color: white; padding: 14px 20px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Complete Payment
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          If you did not initiate this order, ignore this email.
        </p>
      </div>
    `;

    await axios.post(
      "https://api.mailersend.com/v1/email",
      {
        from: { email: process.env.EMAIL_FROM! },
        to: [{ email: process.env.EMAIL_FROM! }],
        subject: "Complete your purchase on SellEasi",
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    logger.info("Cart reminder email sent", { orderId, userId });
  } catch (error: any) {
    logger.error("Failed to send cart reminder email", {
      orderId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

async sendLowStockAlertEmail(
  inventoryId: string,
  storeId: string,
  quantityAvailable: number,
  reorderPoint: number
): Promise<void> {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Low Stock Alert</h2>
        <p>One of your products has dropped below the reorder threshold.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Inventory ID</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${inventoryId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Store ID</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${storeId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Current Stock</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #e74c3c;">
              ${quantityAvailable} units
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reorder Point</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${reorderPoint} units</td>
          </tr>
        </table>
        <a href="${process.env.WEB_ORIGIN}/inventory/${inventoryId}"
           style="background-color: #e74c3c; color: white; padding: 14px 20px;
                  text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">
          View Inventory
        </a>
      </div>
    `;

    await axios.post(
      "https://api.mailersend.com/v1/email",
      {
        from: { email: process.env.EMAIL_FROM! },
        to: [{ email: process.env.EMAIL_FROM! }],
        subject: "Low Stock Alert - SellEasi",
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    logger.info("Low stock alert email sent", {
      inventoryId,
      storeId,
      quantityAvailable,
    });
  } catch (error: any) {
    logger.error("Failed to send low stock alert email", {
      inventoryId,
      storeId,
      error: error.message,
    });
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
