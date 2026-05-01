import { Types, FilterQuery } from "mongoose";
import { IStoreRepository } from "../repositories/IStoreRepository";
import Store, { CustomDomainStatusEnum, IStore } from "../models/Store";
import { withTransaction } from "../utils/connectDB";
import logger from "../utils/logger";
import { generateUniqueSubdomain } from "../utils/generateUniqueSubdomain";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import { caddyService } from "./caddy.service";
import { verifyDomainCNAME } from "./domain-verification.service";
import { randomUUID } from "crypto";
import { AppError } from "../utils/AppError";
import { measureStoreOperation, trackError } from "../utils/metrics";
import { requestContext } from "../context/requestContext";

export class StoreService {
  constructor(private storeRepo: IStoreRepository) {}

  async createStore(userId: string, body: Partial<IStore>): Promise<IStore> {
    return measureStoreOperation("createStore", async () =>
      withTransaction(async (session) => {
        let { subdomain, name, customDomain } = body;

        if (!subdomain && name) {
          subdomain = await generateUniqueSubdomain(name);
        }
        if (!subdomain) {
          throw AppError.badRequest("Unable to generate a valid subdomain.");
        }

        const existing = await this.storeRepo.findAllStore({ subdomain }, 0, 1);
        if (existing.length > 0) {
          throw AppError.conflict(`Subdomain "${subdomain}" is already taken`);
        }

        const subdomainRouteId = `store-sub-${randomUUID()}`;

        const storeData: Partial<IStore> = {
          ownerId: new Types.ObjectId(userId),
          ownerName: body.ownerName,
          ownerEmail: body.ownerEmail,
          subdomain,
          slug: body.slug || subdomain,
          caddyRouteId: subdomainRouteId,
          customDomainStatus: CustomDomainStatusEnum.none,
          ...body,
        };

        if (customDomain) {
          storeData.customDomain = customDomain;
          storeData.customDomainStatus = CustomDomainStatusEnum.pending;
        }

        const store = await this.storeRepo.createStore(storeData, session);

        requestContext.set({ storeId: store._id.toString(), eventType: "store.created" });

        logger.info("Store created, registering Caddy route", {
          storeId: store._id.toString(),
          subdomain,
          userId,
          eventType: "store.caddy.registration.start",
        });

        caddyService
          .registerRoute(subdomainRouteId, subdomain, true)
          .catch((err) => {
            trackError("caddy_registration_failed", "createStore", "high");
            logger.error("Caddy subdomain registration failed post store creation", {
              storeId: store._id.toString(),
              subdomain,
              userId,
              eventType: "store.caddy.registration.failed",
              error: err instanceof Error ? err.message : String(err),
            });
          });

        return store;
      })
    );
  }

  async addCustomDomain(storeId: string, customDomain: string): Promise<IStore | null> {
    return measureStoreOperation("addCustomDomain", async () => {
      const existing = await this.storeRepo.findAllStore({ customDomain }, 0, 1);
      if (existing.length > 0) {
        throw AppError.conflict(`Domain "${customDomain}" is already registered`);
      }

      requestContext.set({ storeId, eventType: "store.domain.add" });

      logger.info("Custom domain registration initiated", {
        storeId,
        customDomain,
        eventType: "store.domain.add",
      });

      return this.storeRepo.updateStore(storeId, {
        customDomain,
        customDomainStatus: CustomDomainStatusEnum.pending,
      });
    });
  }

  async verifyAndActivateCustomDomain(storeId: string): Promise<IStore | null> {
    return measureStoreOperation("verifyCustomDomain", async () => {
      const store = await this.storeRepo.findStoreById(storeId);
      if (!store || !store.customDomain) {
        throw AppError.notFound("Store or custom domain not found");
      }
      if (store.customDomainStatus === CustomDomainStatusEnum.verified) {
        logger.info("Custom domain already verified", {
          storeId,
          customDomain: store.customDomain,
          eventType: "store.domain.already_verified",
        });
        return store;
      }

      requestContext.set({ storeId, eventType: "store.domain.verify" });

      const verified = await verifyDomainCNAME(store.customDomain);

      if (!verified) {
        logger.warn("CNAME verification failed", {
          storeId,
          customDomain: store.customDomain,
          eventType: "store.domain.verify.failed",
        });
        await this.storeRepo.updateStore(storeId, {
          customDomainStatus: CustomDomainStatusEnum.pending,
        });
        return null;
      }

      const customRouteId = `store-custom-${randomUUID()}`;

      await caddyService.registerRoute(customRouteId, store.customDomain, false);

      logger.info("Custom domain verified and Caddy route registered", {
        storeId,
        customDomain: store.customDomain,
        eventType: "store.domain.verified",
      });

      return this.storeRepo.updateStore(storeId, {
        customDomainStatus: CustomDomainStatusEnum.verified,
        customDomainVerifiedAt: new Date(),
        caddyCustomRouteId: customRouteId,
      });
    });
  }

  async deleteStore(id: string): Promise<void> {
    return measureStoreOperation("deleteStore", async () => {
      const store = await this.storeRepo.findStoreById(id);

      requestContext.set({ storeId: id, eventType: "store.deleted" });

      if (store?.caddyRouteId) {
        await caddyService.deregisterRoute(store.caddyRouteId).catch((err) => {
          logger.warn("Caddy subdomain route deregistration failed", {
            storeId: id,
            caddyRouteId: store.caddyRouteId,
            eventType: "store.caddy.deregistration.failed",
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      if (store?.caddyCustomRouteId) {
        await caddyService.deregisterRoute(store.caddyCustomRouteId).catch((err) => {
          logger.warn("Caddy custom domain route deregistration failed", {
            storeId: id,
            caddyRouteId: store.caddyCustomRouteId,
            eventType: "store.caddy.custom.deregistration.failed",
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      logger.info("Store deleted", {
        storeId: id,
        eventType: "store.deleted",
      });

      return this.storeRepo.deleteStoreById(id);
    });
  }

  async getAllStores(query: FilterQuery<IStore>, skip: number, limit: number) {
    return measureStoreOperation("getAllStores", async () => {
      const stores = await this.storeRepo.findAllStore(query, skip, limit);
      const totalCount = await Store.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      logger.debug("Store list fetched", {
        count: stores.length,
        totalCount,
        totalPages,
        eventType: "store.list.fetched",
      });

      return {
        data: { stores, totalCount, totalPages },
        statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
        success: true,
      };
    });
  }

  async getStoreById(id: string): Promise<IStore | null> {
    const store = await this.storeRepo.findStoreById(id);
    if (!store) {
      logger.warn("Store not found by id", {
        storeId: id,
        eventType: "store.not_found",
      });
    }
    return store;
  }

  async getStoreBySubdomain(subdomain: string): Promise<IStore | null> {
    const store = await this.storeRepo.findBySubdomain(subdomain);
    if (!store) {
      logger.warn("Store not found by subdomain", {
        subdomain,
        eventType: "store.subdomain.not_found",
      });
    }
    return store;
  }

  async getStoreByDomain(domain: string): Promise<IStore | null> {
    const store = await this.storeRepo.findByCustomDomain(domain);
    if (!store) {
      logger.warn("Store not found by custom domain", {
        domain,
        eventType: "store.domain.not_found",
      });
    }
    return store;
  }

  async updateStore(id: string, body: Partial<IStore>): Promise<IStore | null> {
    return measureStoreOperation("updateStore", async () => {
      if (body.subdomain) {
        const existing = await this.storeRepo.findBySubdomain(body.subdomain);
        if (existing && existing._id.toString() !== id) {
          throw AppError.conflict(`Subdomain "${body.subdomain}" is already taken`);
        }
      }

      requestContext.set({ storeId: id, eventType: "store.updated" });

      logger.info("Store update initiated", {
        storeId: id,
        updatedFields: Object.keys(body),
        eventType: "store.updated",
      });

      return this.storeRepo.updateStore(id, body);
    });
  }
}