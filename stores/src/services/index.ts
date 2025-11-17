import { StoreRepository } from "../repositories/StoreRepository";
import { StoreService } from "./store.service";

const storeRepo = new StoreRepository();
export const storeService = new StoreService(storeRepo);
