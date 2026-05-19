import mongoose, { FilterQuery } from "mongoose";
import AuditLog, { IAuditLog }   from "./audit.model";
import logger                    from "../../utils/logger";
import { SERVICE_NAME }          from "../../constants";

export const auditRepository = {
  async create(
    data:     Partial<IAuditLog>,
    session?: mongoose.ClientSession
  ): Promise<IAuditLog> {
    const options = session ? { session } : {};
    const [log]   = await AuditLog.create([data], options);

    logger.info("audit_log_created", {
      event:    "audit_log_created",
      service:  SERVICE_NAME,
      auditId:  log._id.toString(),
      action:   log.action,
      source:   log.source,
      severity: log.severity,
      actorId:  log.actorId,
    });

    return log;
  },

  async findAll(
    query: FilterQuery<IAuditLog>,
    skip:  number,
    limit: number
  ): Promise<IAuditLog[]> {
    return AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IAuditLog[]>()
      .exec();
  },

  async count(query: FilterQuery<IAuditLog>): Promise<number> {
    return AuditLog.countDocuments(query).exec();
  },

  async findById(auditId: string): Promise<IAuditLog | null> {
    return AuditLog.findById(auditId).lean<IAuditLog>().exec();
  },

  async findBySagaId(sagaId: string): Promise<IAuditLog[]> {
    return AuditLog.find({ sagaId })
      .sort({ createdAt: 1 })
      .lean<IAuditLog[]>()
      .exec();
  },
};