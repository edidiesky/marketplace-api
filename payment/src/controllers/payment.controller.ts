import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
import { IPayment, PaymentGateway } from "../models/Payment";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  BAD_REQUEST_STATUS_CODE,
} from "../constants";
import logger from "../utils/logger";
import { paymentService } from "../services/payment.service";
import { Types } from "mongoose";
import { buildQuery } from "../utils/buildQuery";

/**
 * @description Initialize Payment
 * @routes  POST /api/v1/payments/initialize
 * @private
 */
export const initializePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      orderId,
      gateway,
      customerEmail,
      customerName,
      amount,
      phone,
      currency,
    } = req.body as Partial<IPayment>;

    const userId = (req as AuthenticatedRequest).user.userId;

    const result = await paymentService.initializePayment({
      orderId,
      gateway,
      customerEmail,
      customerName,
      amount,
      phone,
      currency,
      customerId: new Types.ObjectId(userId),
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      message: "Payment initialized successfully",
      data: result,
    });
  }
);

/**
 * @description Get Payment History
 * @routes  GET /api/v1/payments/history
 * @private
 */
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query = buildQuery(req);
    const result = await paymentService.getPaymentHistory(
      query,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(result);
  }
);

/**
 * @description Get Single Payment History
 * @routes GET /api/v1/payments/:id
 * @private
 */
export const getPaymentById = asyncHandler(
  async (req: Request, res: Response) => {
    const payment = await paymentService.getPaymentById(req.params.id);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data: payment,
    });
  }
);

/**
 * @description Handle ZWebhook Payment Notifications
 * @routesGET POST /api/v1/payments/webhook
 * @private
 */
export const handleWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const gateway = req.params.gateway as PaymentGateway;

    if (!Object.values(PaymentGateway).includes(gateway)) {
      res.status(BAD_REQUEST_STATUS_CODE).json({ message: "Unsupported gateway" });
      return;
    }

    const signature = req.headers["x-paystack-signature"] as string;

    try {
      const payment = await paymentService.handleWebhook(
        gateway,
        req.body,
        signature
      );

      logger.info("Webhook processed successfully", {
        gateway,
        paymentId: payment.paymentId,
        status: payment.status,
        event: req.body.event,
      });

      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message: "Thank you", success: true });
    } catch (err: any) {
      logger.error("Webhook processing failed", {
        gateway,
        error: err.message,
        event: req.body.event,
      });

      if (err.message.toLowerCase().includes("signature")) {
        res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message: "Invalid signature - ignored" });
        return;
      }

      res.status(BAD_REQUEST_STATUS_CODE).json({ message: err.message });
    } finally {
      
    }
  }
);

// 

/**
 * @description Handle Webhook Payment Notifications
 * @routesGET POST /api/v1/payments/:paymentId/refund
 * @private
 */
export const initiateRefund = asyncHandler(
  async (req: Request, res: Response) => {
    const payment = await paymentService.getPaymentById(req.params.paymentId);

    const refundedPayment = await paymentService.initiateRefund(
      req.params.paymentId,
      req.body.amount,
      req.body.reason
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Refund initiated successfully",
      data: refundedPayment,
    });
  }
);
