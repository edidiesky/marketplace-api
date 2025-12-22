import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  CreateOrderHandler,
  GetUserOrdersHandler,
  GetOrderHandler,
} from "../controllers/order.controller";

const router = express.Router();

router
  .route("/:storeId")
  .post(authenticate, CreateOrderHandler)
  .get(authenticate, GetUserOrdersHandler);

router.route("/:id").get(authenticate, GetOrderHandler);

export default router;