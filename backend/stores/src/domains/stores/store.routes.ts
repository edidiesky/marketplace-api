import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import {
  createStoreSchema,
  updateStoreSchema,
  updateStoreStatusSchema,
  addCustomDomainSchema,
} from "./store.validator";
import {
  CreateStoreHandler,
  GetMyStoresHandler,
  GetAllStoresHandler,
  GetStoreByIdHandler,
  GetStoreBySubdomainHandler,
  ResolveStoreByHostHandler,
  UpdateStoreHandler,
  UpdateStoreStatusHandler,
  AddCustomDomainHandler,
  VerifyCustomDomainHandler,
  RemoveCustomDomainHandler,
  DeleteStoreHandler,
} from "./store.controller";
import { internalOnly } from "../../middleware/internal";

const router = Router();

router.get(
  "/resolve",
  ResolveStoreByHostHandler
);

router.get(
  "/subdomain/:subdomain",
  GetStoreBySubdomainHandler
);

router.post(
  "/",
  authenticate,
  validateRequest(createStoreSchema),
  CreateStoreHandler
);

router.get(
  "/me",
  authenticate,
  GetMyStoresHandler
);

router.get(
  "/",
  authenticate,
  GetAllStoresHandler
);

router.get(
  "/:storeId",
  GetStoreByIdHandler
);

router.patch(
  "/:storeId",
  authenticate,
  validateRequest(updateStoreSchema),
  UpdateStoreHandler
);

router.patch(
  "/:storeId/status",
  authenticate,
  validateRequest(updateStoreStatusSchema),
  UpdateStoreStatusHandler
);

router.post(
  "/:storeId/domain",
  authenticate,
  validateRequest(addCustomDomainSchema),
  AddCustomDomainHandler
);

router.post(
  "/:storeId/domain/verify",
  authenticate,
  VerifyCustomDomainHandler
);

router.get(
  "/internal/subdomain/:subdomain",
  internalOnly,
  GetStoreBySubdomainHandler
);

router.delete(
  "/:storeId/domain",
  authenticate,
  RemoveCustomDomainHandler
);

router.delete(
  "/:storeId",
  authenticate,
  DeleteStoreHandler
);

export default router;