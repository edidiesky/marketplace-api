import { Router, Request, Response } from "express";
import { esController } from "../controllers/es.controller";

const router = Router();

// GET /api/v1/products/search?q=shoe&storeId=x&minPrice=10&maxPrice=500&page=1&limit=20
router.get("/search", esController.search);

// GET /api/v1/products/autocomplete?q=sne&storeId=x
router.get("/autocomplete", esController.autoComplete);

export default router;
