import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { auditService }         from "./audit.service";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import {
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";
import { AuditAction, AuditSeverity, AuditSource } from "./audit.model";

export const GetAuditLogsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page      = Number(req.query["page"]      ?? 1);
    const limit     = Number(req.query["limit"]     ?? 20);
    const action    = req.query["action"]    as AuditAction   | undefined;
    const source    = req.query["source"]    as AuditSource   | undefined;
    const severity  = req.query["severity"]  as AuditSeverity | undefined;
    const actorId   = req.query["actorId"]   as string        | undefined;
    const storeId   = req.query["storeId"]   as string        | undefined;
    const sagaId    = req.query["sagaId"]    as string        | undefined;
    const startDate = req.query["startDate"]
      ? new Date(req.query["startDate"] as string)
      : undefined;
    const endDate   = req.query["endDate"]
      ? new Date(req.query["endDate"] as string)
      : undefined;

    const result = await auditService.getAuditLogs({
      action,
      source,
      severity,
      actorId,
      storeId,
      sagaId,
      startDate,
      endDate,
      page,
      limit,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetAuditLogByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const auditId = req.params["auditId"] as string;
    const log     = await auditService.getAuditLogById(auditId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    log,
    });
  }
);

export const GetAuditLogsBySagaIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const sagaId = req.params["sagaId"] as string;
    const logs   = await auditService.getAuditLogsBySagaId(sagaId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    logs,
    });
  }
);

export const GetMyActivityHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const page       = Number(req.query["page"]     ?? 1);
    const limit      = Number(req.query["limit"]    ?? 20);
    const action     = req.query["action"]   as AuditAction   | undefined;
    const source     = req.query["source"]   as AuditSource   | undefined;
    const startDate  = req.query["startDate"]
      ? new Date(req.query["startDate"] as string)
      : undefined;
    const endDate    = req.query["endDate"]
      ? new Date(req.query["endDate"] as string)
      : undefined;

    const result = await auditService.getAuditLogs({
      actorId: userId,
      action,
      source,
      startDate,
      endDate,
      page,
      limit,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetUserActivityHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId    = req.params["userId"] as string;
    const page      = Number(req.query["page"]     ?? 1);
    const limit     = Number(req.query["limit"]    ?? 20);
    const action    = req.query["action"]   as AuditAction   | undefined;
    const source    = req.query["source"]   as AuditSource   | undefined;
    const startDate = req.query["startDate"]
      ? new Date(req.query["startDate"] as string)
      : undefined;
    const endDate   = req.query["endDate"]
      ? new Date(req.query["endDate"] as string)
      : undefined;

    const result = await auditService.getAuditLogs({
      actorId: userId,
      action,
      source,
      startDate,
      endDate,
      page,
      limit,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetStoreAuditLogsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId   = req.params["storeId"] as string;
    const page      = Number(req.query["page"]     ?? 1);
    const limit     = Number(req.query["limit"]    ?? 20);
    const action    = req.query["action"]   as AuditAction   | undefined;
    const severity  = req.query["severity"] as AuditSeverity | undefined;
    const startDate = req.query["startDate"]
      ? new Date(req.query["startDate"] as string)
      : undefined;
    const endDate   = req.query["endDate"]
      ? new Date(req.query["endDate"] as string)
      : undefined;

    const result = await auditService.getAuditLogs({
      storeId,
      action,
      severity,
      startDate,
      endDate,
      page,
      limit,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);