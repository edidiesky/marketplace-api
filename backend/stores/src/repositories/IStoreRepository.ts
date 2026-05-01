import { FilterQuery } from "mongoose";
import mongoose from "mongoose";
import { IStore } from "../models/Store";

export interface IStoreRepository {
  createStore(data: Partial<IStore>, session?: mongoose.ClientSession): Promise<IStore>;
  findAllStore(query: FilterQuery<IStore>, skip: number, limit: number): Promise<IStore[]>;
  countStores(query: FilterQuery<IStore>): Promise<number>;
  findStoreById(id: string): Promise<IStore | null>;
  findBySubdomain(subdomain: string): Promise<IStore | null>;
  findByCustomDomain(domain: string): Promise<IStore | null>;
  updateStore(id: string, data: Partial<IStore>): Promise<IStore | null>;
  deleteStoreById(id: string): Promise<void>;
}