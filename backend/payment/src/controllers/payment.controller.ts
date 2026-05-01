import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
import { IPayment } from "../models/Payment";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
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
      phone,
      currency,
      customerId: userId,
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

