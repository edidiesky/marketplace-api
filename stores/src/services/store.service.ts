import mongoose, { FilterQuery, Types } from "mongoose";
import { IStoreRepository } from "../repositories/IStoreRepository";
import Store, { IStore } from "../models/Store";
import { withTransaction } from "../utils/connectDB";
import logger from "../utils/logger";
import { generateUniqueSubdomain } from "../utils/generateUniqueSubdomain";

export class StoreService {
  constructor(private storeRepo: IStoreRepository) {}
  /**
   * @description Create Store method
   * @param userId
   * @param body
   * @returns
   */
  async createStore(userId: string, body: Partial<IStore>): Promise<IStore> {
    return withTransaction(async (session) => {
      let { subdomain, name } = body;

      if (!subdomain && name) {
        subdomain = await generateUniqueSubdomain(name);
        logger.info(
          `Auto-generated subdomain: ${subdomain} for store: ${name}`
        );
      }
      if (!subdomain) {
        throw new Error(
          "Unable to generate a valid subdomain. Try setting one manually."
        );
      }

      const existingStore = await this.storeRepo.findAllStore(
        { subdomain },
        0,
        1
      );

      if (existingStore.length > 0) {
        logger.error(`Subdomain "${subdomain}" is already taken`,{
          subdomain
        })
        throw new Error(`Subdomain "${subdomain}" is already taken`);
      }

      const storeData = {
        ownerId: new Types.ObjectId(userId),
        ownerName: body.ownerName,
        ownerEmail: body.ownerEmail,
        subdomain,
        slug: body.slug || subdomain,
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
  ): Promise<{
    stores: Promise<IStore[]>;
    totalCount: number;
    totalPages: number;
  }> {
    const stores = this.storeRepo.findAllStore(query, skip, limit);
    const totalCount = await Store.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      stores,
      totalCount,
      totalPages,
    };
  }

  /**
   * @description Get single Store method
   * @param query id
   * @returns
   */
  async getStoreById(id: string): Promise<IStore | null> {
    return this.storeRepo.findStoreById(id);
  }

  async getStoreBySubdomain(subdomain: string): Promise<IStore | null> {
    const stores = await this.storeRepo.findAllStore({ subdomain }, 0, 1);
    return stores[0] || null;
  }

  /**
   * @description update single Store method
   * @param id
   * @param body
   * @returns
   */
  async updateStore(id: string, body: Partial<IStore>): Promise<IStore | null> {
    if (body.subdomain) {
      const existingStore = await this.getStoreBySubdomain(body.subdomain);

      if (existingStore && existingStore._id.toString() !== id) {
        throw new Error(`Subdomain "${body.subdomain}" is already taken`);
      }
    }

    return this.storeRepo.updateStore(id, body);
  }

  async deleteStore(id: string): Promise<void> {
    return this.storeRepo.deleteStoreById(id);
  }
}

