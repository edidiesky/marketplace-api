import mongoose, { FilterQuery } from "mongoose";
import { IStore } from "../models/Store";

export interface IStoreRepository {
  createStore(
    data: Partial<IStore>,
    session?: mongoose.ClientSession
  ): Promise<IStore>;
  findAllStore(
    query: FilterQuery<IStore>,
    skip: number,
    limit: number
  ): Promise<IStore[]>;
  findStoreById(storeId: string): Promise<IStore | null>;
  updateStore(storeId: string, data: Partial<IStore>): Promise<IStore | null>;
  deleteStoreById(storeId: string): Promise<void>;
}
