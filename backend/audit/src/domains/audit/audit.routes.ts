import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  GetAuditLogsHandler,
  GetAuditLogByIdHandler,
  GetAuditLogsBySagaIdHandler,
  GetMyActivityHandler,
  GetUserActivityHandler,
  GetStoreAuditLogsHandler,
} from "./audit.controller";

const router = Router();

router.use(authenticate);

router.get("/me",                    GetMyActivityHandler);
router.get("/saga/:sagaId",          GetAuditLogsBySagaIdHandler);
router.get("/store/:storeId",        GetStoreAuditLogsHandler);
router.get("/user/:userId",          GetUserActivityHandler);
router.get("/:auditId",             GetAuditLogByIdHandler);
router.get("/",                      GetAuditLogsHandler);

export default router;