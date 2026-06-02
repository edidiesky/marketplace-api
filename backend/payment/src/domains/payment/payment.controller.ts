import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { paymentService }       from "./payment.service";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";
import { PaymentGateway }       from "./payment.model";
import { buildPaymentQuery } from "../../utils/buildQuery";

export const InitializePaymentHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const {
      orderId,
      gateway,
      customerEmail,
      customerName,
      phone,
      currency,
    } = req.body as {
      orderId:       string;
      gateway:       PaymentGateway;
      customerEmail: string;
      customerName:  string;
      phone?:        string;
      currency?:     string;
    };

    const result = await paymentService.initializePayment({
      orderId,
      gateway,
      customerEmail,
      customerName,
      customerId: userId,
      phone,
      currency,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      message: "Payment initialized successfully.",
      data:    result,
    });
  }
);

export const GetPaymentHistoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page       = Number(req.query["page"]  ?? 1);
    const limit      = Number(req.query["limit"] ?? 20);

    const query: Record<string, unknown> = buildPaymentQuery(req)

    const result = await paymentService.getPaymentHistory(query, page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetPaymentByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id      = req.params["id"] as string;
    const payment = await paymentService.getPaymentById(id);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    payment,
    });
  }
);

export const InitiateRefundHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const paymentId = req.params["paymentId"] as string;
    const { amount, reason } = req.body as {
      amount?: number;
      reason?: string;
    };

    const payment = await paymentService.initiateRefund(
      paymentId,
      amount,
      reason
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Refund initiated successfully.",
      data:    payment,
    });
  }
);

export const GetPaymentStatsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params["storeId"] as string;
    const days    = Number(req.query["days"] ?? 30);

    const stats = await paymentService.getPaymentStats(storeId, days);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    stats,
    });
  }
);