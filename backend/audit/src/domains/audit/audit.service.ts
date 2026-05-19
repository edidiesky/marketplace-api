import { FilterQuery }       from "mongoose";
import { auditRepository }   from "./audit.repository";
import { AppError }          from "../../utils/AppError";
import { SERVICE_NAME }      from "../../constants";
import { requestContext }    from "../../context/requestContext";
import logger                from "../../utils/logger";
import {
  AuditAction,
  AuditSeverity,
  AuditSource,
  IAuditLog,
} from "./audit.model";
import {
  AuditListResponseDto,
  AuditLogResponseDto,
  AuditQueryDto,
  CreateAuditDto,
} from "./audit.dto";

function toDto(log: IAuditLog): AuditLogResponseDto {
  return {
    auditId:      log._id.toString(),
    action:       log.action,
    source:       log.source,
    severity:     log.severity,
    actorId:      log.actorId,
    actorType:    log.actorType,
    resourceId:   log.resourceId,
    resourceType: log.resourceType,
    storeId:      log.storeId,
    sagaId:       log.sagaId,
    requestId:    log.requestId,
    payload:      log.payload,
    createdAt:    log.createdAt,
  };
}

function inferSeverity(action: AuditAction): AuditSeverity {
  const critical = new Set<AuditAction>([
    AuditAction.PAYMENT_FAILED,
    AuditAction.ORDER_FAILED,
    AuditAction.ORDER_ABANDONED,
    AuditAction.INVENTORY_RESERVATION_FAILED,
    AuditAction.PAYOUT_REJECTED,
    AuditAction.USER_PASSWORD_RESET,
  ]);

  const warning = new Set<AuditAction>([
    AuditAction.REVIEW_REJECTED,
    AuditAction.STORE_STATUS_CHANGED,
    AuditAction.PAYMENT_REFUNDED,
  ]);

  if (critical.has(action)) return AuditSeverity.CRITICAL;
  if (warning.has(action))  return AuditSeverity.WARNING;
  return AuditSeverity.INFO;
}

export const auditService = {
  async createLog(dto: CreateAuditDto): Promise<AuditLogResponseDto> {
    const severity = dto.severity ?? inferSeverity(dto.action);

    const log = await auditRepository.create({
      action:       dto.action,
      source:       dto.source,
      severity,
      actorId:      dto.actorId,
      actorType:    dto.actorType,
      resourceId:   dto.resourceId,
      resourceType: dto.resourceType,
      storeId:      dto.storeId,
      sagaId:       dto.sagaId,
      requestId:    dto.requestId ?? requestContext.get()?.requestId,
      payload:      dto.payload,
    });

    return toDto(log);
  },

  async getAuditLogs(dto: AuditQueryDto): Promise<AuditListResponseDto> {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;

    const query: FilterQuery<IAuditLog> = {};

    if (dto.action)   query["action"]   = dto.action;
    if (dto.source)   query["source"]   = dto.source;
    if (dto.severity) query["severity"] = dto.severity;
    if (dto.actorId)  query["actorId"]  = dto.actorId;
    if (dto.storeId)  query["storeId"]  = dto.storeId;
    if (dto.sagaId)   query["sagaId"]   = dto.sagaId;

    if (dto.startDate || dto.endDate) {
      query["createdAt"] = {};
      if (dto.startDate) query["createdAt"]["$gte"] = dto.startDate;
      if (dto.endDate)   query["createdAt"]["$lte"] = dto.endDate;
    }

    const [logs, total] = await Promise.all([
      auditRepository.findAll(query, skip, limit),
      auditRepository.count(query),
    ]);

    return {
      logs:       logs.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async getAuditLogById(auditId: string): Promise<AuditLogResponseDto> {
    const log = await auditRepository.findById(auditId);
    if (!log) throw AppError.notFound("Audit log not found.");
    return toDto(log);
  },

  async getAuditLogsBySagaId(sagaId: string): Promise<AuditLogResponseDto[]> {
    const logs = await auditRepository.findBySagaId(sagaId);
    return logs.map(toDto);
  },
};