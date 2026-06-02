import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  GetMyOrganizationHandler,
  GetOrganizationByIdHandler,
  GetAllOrganizationsHandler,
  UpdateOrganizationHandler,
} from "./organization.controller";

const router = Router();

router.use(authenticate);

router.get("/me",                     GetMyOrganizationHandler);
router.get("/",                       GetAllOrganizationsHandler);
router.get("/:organizationId",        GetOrganizationByIdHandler);
router.patch("/:organizationId",      UpdateOrganizationHandler);

export default router;