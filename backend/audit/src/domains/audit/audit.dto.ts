import { AuditAction, AuditSeverity, AuditSource } from "./audit.model";

export interface CreateAuditDto {
  action:        AuditAction;
  source:        AuditSource;
  severity?:     AuditSeverity;
  actorId?:      string;
  actorType?:    string;
  resourceId?:   string;
  resourceType?: string;
  storeId?:      string;
  sagaId?:       string;
  requestId?:    string;
  payload:       Record<string, unknown>;
}

export interface AuditLogResponseDto {
  auditId:       string;
  action:        AuditAction;
  source:        AuditSource;
  severity:      AuditSeverity;
  actorId?:      string;
  actorType?:    string;
  resourceId?:   string;
  resourceType?: string;
  storeId?:      string;
  sagaId?:       string;
  requestId?:    string;
  payload:       Record<string, unknown>;
  createdAt:     Date;
}

export interface AuditQueryDto {
  action?:    AuditAction;
  source?:    AuditSource;
  severity?:  AuditSeverity;
  actorId?:   string;
  storeId?:   string;
  sagaId?:    string;
  startDate?: Date;
  endDate?:   Date;
  page?:      number;
  limit?:     number;
}

export interface AuditListResponseDto {
  logs:       AuditLogResponseDto[];
  totalCount: number;
  totalPages: number;
  page:       number;
  limit:      number;
}