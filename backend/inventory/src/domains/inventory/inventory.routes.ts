import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import { internalOnly }    from "../../middleware/internal.middleware";
import {
  createInventorySchema,
  updateInventorySchema,
  reserveStockSchema,
  releaseStockSchema,
  commitStockSchema,
  expireReservationSchema,
} from "./inventory.validator";
import {
  CreateInventoryHandler,
  GetStoreInventoryHandler,
  GetInventoryByIdHandler,
  CheckAvailabilityHandler,
  UpdateInventoryHandler,
  DeleteInventoryHandler,
  ReserveStockHandler,
  ReleaseStockHandler,
  CommitStockHandler,
  ExpireReservationHandler,
} from "./inventory.controller";

const router = Router();

router.post(
  "/reserve",
  internalOnly,
  validateRequest(reserveStockSchema),
  ReserveStockHandler
);

router.post(
  "/release",
  internalOnly,
  validateRequest(releaseStockSchema),
  ReleaseStockHandler
);

router.post(
  "/commit",
  internalOnly,
  validateRequest(commitStockSchema),
  CommitStockHandler
);

router.get(
  "/check/:productId",
  CheckAvailabilityHandler
);

router.post(
  "/internal/reservations/:sagaId/expire",
  internalOnly,
  validateRequest(expireReservationSchema),
  ExpireReservationHandler
);

router
  .route("/:storeId/store")
  .post(
    authenticate,
    validateRequest(createInventorySchema),
    CreateInventoryHandler
  )
  .get(authenticate, GetStoreInventoryHandler);

router
  .route("/:inventoryId")
  .get(authenticate, GetInventoryByIdHandler)
  .patch(
    authenticate,
    validateRequest(updateInventorySchema),
    UpdateInventoryHandler
  )
  .delete(authenticate, DeleteInventoryHandler);

export default router;