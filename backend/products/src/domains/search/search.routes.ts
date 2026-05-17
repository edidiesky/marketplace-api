import { Router } from "express";
import {
  SearchProductsHandler,
  AutocompleteProductsHandler,
} from "./search.controller";

const router = Router();

router.get("/search",       SearchProductsHandler);
router.get("/autocomplete", AutocompleteProductsHandler);

export default router;