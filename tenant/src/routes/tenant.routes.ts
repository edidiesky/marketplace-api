import express from "express";
import {
  CreateTenantHandler,
  GetAllTenantHandler,
  GetSingleTenantHandler,
  UpdateTenantHandler,
  DeleteTenantHandler,
} from "../controllers/tenant.controller";
import {
  authenticate,
} from "../middleware/auth.middleware";
import { tenantSchema } from "../validators/tenant.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    validateRequest(tenantSchema),
    CreateTenantHandler
  )
  .get(authenticate, GetAllTenantHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleTenantHandler)
  .put(authenticate, UpdateTenantHandler)
  .delete(authenticate, DeleteTenantHandler);
export default router;
