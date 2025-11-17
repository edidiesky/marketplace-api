import mongoose, { FilterQuery, Types } from "mongoose";
import { IStoreRepository } from "../repositories/IStoreRepository";
import { IStore } from "../models/Store";
import { withTransaction } from "../utils/connectDB";

export class StoreService {
  constructor(private storeRepo: IStoreRepository) {}
  /**
   * @description Create Store method
   * @param userId
   * @param body
   * @returns
   */
  async createStore(
    userId: string,
    body: Partial<IStore>,
  ): Promise<IStore> {
    return withTransaction(async (session) => {
      const storeData = {
        ownerId: new Types.ObjectId(userId),
        ...body,
      };

      const store = await this.storeRepo.createStore(storeData, session);

      return store;
    });
  }

  /**
   * @description Get all Store method
   * @param query
   * @param skip
   * @param limit
   * @returns
   */
  async getAllStores(
    query: FilterQuery<IStore>,
    skip: number,
    limit: number
  ): Promise<IStore[]> {
    return this.storeRepo.findAllStore(query, skip, limit);
  }

  /**
   * @description Get single Store method
   * @param query id
   * @returns
   */
  async getStoreById(id: string): Promise<IStore | null> {
    return this.storeRepo.findStoreById(id);
  }

  /**
   * @description update single Store method
   * @param id
   * @param body
   * @returns
   */
  async updateStore(id: string, body: Partial<IStore>): Promise<IStore | null> {
    return this.storeRepo.updateStore(id, body);
  }

  async deleteStore(id: string): Promise<void> {
    return this.storeRepo.deleteStoreById(id);
  }
}
