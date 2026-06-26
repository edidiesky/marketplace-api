import { Types } from "mongoose";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { storeRepository } from "./store.repository";
import { caddyService } from "../../services/caddy.service";
import { verifyDomainCNAME } from "../../services/domain-verification.service";
import { generateUniqueSubdomain } from "../../utils/generateUniqueSubdomain";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";
import { requestContext } from "../../context/requestContext";
import {
  publishStoreCreated,
  publishNotificationStoreOnboarding,
} from "../../messaging/publisher";
import {
  CreateStoreDto,
  StoreListResponseDto,
  StoreResponseDto,
  UpdateStoreDto,
  UpdateStoreStatusDto,
} from "./store.dto";
import { CustomDomainStatus, IStore, StoreStatus } from "./store.model";

function toDto(store: IStore): StoreResponseDto {
  return {
    storeId:               store._id?.toString() ?? "",
    organizationId:        store.organizationId?.toString() ?? "",
    ownerId:               store.ownerId?.toString() ?? "",
    ownerName:             store.ownerName,
    ownerEmail:            store.ownerEmail,
    name:                  store.name,
    subdomain:             store.subdomain,
    slug:                  store.slug,
    description:           store.description,
    logo:                  store.logo,
    banner:                store.banner,
    email:                 store.email,
    phoneNumber:           store.phoneNumber,
    address:               store.address,
    settings:              store.settings,
    status:                store.status,
    customDomain:          store.customDomain,
    customDomainStatus:    store.customDomainStatus,
    customDomainVerifiedAt: store.customDomainVerifiedAt,
    createdAt:             store.createdAt,
    updatedAt:             store.updatedAt,
  };
}

export const storeService = {
  async createStore(dto: CreateStoreDto): Promise<StoreResponseDto> {
    const session = await mongoose.startSession();

    let store!: IStore;

    await session.withTransaction(async () => {
      let subdomain = dto.subdomain;
      if (!subdomain && dto.name) {
        subdomain = await generateUniqueSubdomain(dto.name);
      }
      if (!subdomain) {
        throw AppError.badRequest("Unable to generate a valid subdomain.");
      }

      const existing = await storeRepository.findBySubdomain(subdomain);
      if (existing) {
        throw AppError.conflict(`Subdomain "${subdomain}" is already taken.`);
      }

      const subdomainRouteId = `store-sub-${randomUUID()}`;

      const storeData: Partial<IStore> = {
        organizationId:dto.organizationId,
        ownerId: new Types.ObjectId(dto.ownerId),
        ownerName: dto.ownerName,
        ownerEmail: dto.ownerEmail,
        name: dto.name,
        subdomain,
        slug: dto.subdomain ?? subdomain,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
        settings: {
          currency: dto.settings?.currency ?? "NGN",
          timezone: dto.settings?.timezone ?? "Africa/Lagos",
          taxRate: dto.settings?.taxRate ?? 0,
          shippingMethods: dto.settings?.shippingMethods ?? [],
          paymentMethods: dto.settings?.paymentMethods ?? [],
        },
        description: dto.description,
        logo: dto.logo,
        status: StoreStatus.ACTIVE,
        caddyRouteId: subdomainRouteId,
        customDomainStatus: CustomDomainStatus.NONE,
        notificationId: dto.notificationId,
      };

      store = await storeRepository.create(storeData, session);
    });

    session.endSession();

    requestContext.set({
      storeId: store._id.toString(),
      eventType: "store.created",
    });

    logger.info("store_created", {
      event: "store_created",
      service: SERVICE_NAME,
      storeId: store._id.toString(),
      subdomain: store.subdomain,
      ownerId: store.ownerId.toString(),
    });

    caddyService
      .registerRoute(store.caddyRouteId!, store.subdomain, true)
      .catch((err) => {
        logger.error("caddy_subdomain_registration_failed", {
          event: "caddy_subdomain_registration_failed",
          service: SERVICE_NAME,
          storeId: store._id.toString(),
          subdomain: store.subdomain,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    publishStoreCreated({
      storeId: store._id.toString(),
      organizationId: store.organizationId.toString(),
      ownerId: store.ownerId.toString(),
      subdomain: store.subdomain,
    });

    publishNotificationStoreOnboarding({
      email: store.ownerEmail,
      name: store.ownerName,
      store: store.name,
      storeUrl: `https://${store.subdomain}.${process.env.PLATFORM_DOMAIN}`,
      notificationId: store.notificationId ?? randomUUID(),
    });

    return toDto(store);
  },

  async getMyStores(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<StoreListResponseDto> {
    const skip = (page - 1) * limit;
    const query = { ownerId: new Types.ObjectId(ownerId) };
    const stores = await storeRepository.findAll(query, skip, limit);
    const total = await storeRepository.count(query);

    return {
      stores: stores.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async getAllStores(
    page: number,
    limit: number,
  ): Promise<StoreListResponseDto> {
    const skip = (page - 1) * limit;
    const stores = await storeRepository.findAll({}, skip, limit);
    const total = await storeRepository.count({});

    return {
      stores: stores.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async getStoreById(storeId: string): Promise<StoreResponseDto> {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw AppError.notFound(`Store not found.`);
    }
    return toDto(store);
  },

  async getStoreBySubdomain(subdomain: string): Promise<StoreResponseDto> {
    const store = await storeRepository.findBySubdomain(subdomain);
    if (!store) {
      throw AppError.notFound(`Store not found.`);
    }
    return toDto(store);
  },

  async getStoreByHost(host: string): Promise<StoreResponseDto> {
    const platformDomain = process.env.PLATFORM_DOMAIN!;
    let store: IStore | null = null;

    if (host.endsWith(`.${platformDomain}`)) {
      const subdomain = host.replace(`.${platformDomain}`, "");
      logger.debug("store_resolve_by_subdomain", {
        event: "store_resolve_by_subdomain",
        service: SERVICE_NAME,
        subdomain,
        host,
      });
      store = await storeRepository.findBySubdomain(subdomain);
    } else {
      logger.debug("store_resolve_by_custom_domain", {
        event: "store_resolve_by_custom_domain",
        service: SERVICE_NAME,
        host,
      });
      store = await storeRepository.findByCustomDomain(host);
    }

    if (!store) {
      throw AppError.notFound("Store not found.");
    }

    logger.info("store_resolved", {
      event: "store_resolved",
      service: SERVICE_NAME,
      storeId: store._id.toString(),
      host,
    });

    return toDto(store);
  },

  async updateStore(
    storeId: string,
    organizationId: string,
    dto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const store = await storeRepository.findById(storeId);
    if (!store) throw AppError.notFound("Store not found.");

    if (store.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to update this store.",
      );
    }

    if (store.status === StoreStatus.SUSPENDED) {
      throw AppError.forbidden("Cannot update a suspended store.");
    }

    const patch: Partial<IStore> = {};

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.logo !== undefined) patch.logo = dto.logo;
    if (dto.banner !== undefined) patch.banner = dto.banner;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phoneNumber !== undefined) patch.phoneNumber = dto.phoneNumber;

    if (dto.address !== undefined) {
      patch.address = {
        street: dto.address.street ?? store.address?.street ?? "",
        city: dto.address.city ?? store.address?.city ?? "",
        state: dto.address.state ?? store.address?.state ?? "",
        country: dto.address.country ?? store.address?.country ?? "",
        postalCode: dto.address.postalCode ?? store.address?.postalCode,
      };
    }

    if (dto.settings !== undefined) {
      patch.settings = {
        currency: dto.settings.currency ?? store.settings?.currency ?? "NGN",
        timezone:
          dto.settings.timezone ?? store.settings?.timezone ?? "Africa/Lagos",
        taxRate: dto.settings.taxRate ?? store.settings?.taxRate ?? 0,
        shippingMethods:
          dto.settings.shippingMethods ?? store.settings?.shippingMethods ?? [],
        paymentMethods:
          dto.settings.paymentMethods ?? store.settings?.paymentMethods ?? [],
      };
    }

    const updated = await storeRepository.updateById(storeId, patch);
    if (!updated) throw AppError.notFound("Store not found.");

    requestContext.set({ storeId, eventType: "store.updated" });

    logger.info("store_updated", {
      event: "store_updated",
      service: SERVICE_NAME,
      storeId,
      updatedFields: Object.keys(patch),
    });

    return toDto(updated);
  },
  async updateStoreStatus(
    storeId: string,
    dto: UpdateStoreStatusDto,
  ): Promise<StoreResponseDto> {
    const store = await storeRepository.findById(storeId);
    if (!store) throw AppError.notFound("Store not found.");

    const updated = await storeRepository.updateById(storeId, {
      status: dto.status,
    });
    if (!updated) throw AppError.notFound("Store not found.");

    logger.info("store_status_updated", {
      event: "store_status_updated",
      service: SERVICE_NAME,
      storeId,
      status: dto.status,
      reason: dto.reason,
    });

    return toDto(updated);
  },

  async addCustomDomain(
    storeId: string,
    organizationId: string,
    customDomain: string,
  ): Promise<StoreResponseDto> {
    const existing = await storeRepository.findByCustomDomain(customDomain);
    if (existing) {
      throw AppError.conflict(
        `Domain "${customDomain}" is already registered.`,
      );
    }

    const store = await storeRepository.findById(storeId);
    if (!store) throw AppError.notFound("Store not found.");

    if (store.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to update this store.",
      );
    }

    const updated = await storeRepository.updateById(storeId, {
      customDomain,
      customDomainStatus: CustomDomainStatus.PENDING,
    });
    if (!updated) throw AppError.notFound("Store not found.");

    requestContext.set({ storeId, eventType: "store.domain.add" });

    logger.info("store_custom_domain_added", {
      event: "store_custom_domain_added",
      service: SERVICE_NAME,
      storeId,
      customDomain,
    });

    return toDto(updated);
  },

  async verifyCustomDomain(storeId: string): Promise<StoreResponseDto> {
    const store = await storeRepository.findById(storeId);
    if (!store || !store.customDomain) {
      throw AppError.notFound("Store or custom domain not found.");
    }

    if (store.customDomainStatus === CustomDomainStatus.VERIFIED) {
      return toDto(store);
    }

    const verified = await verifyDomainCNAME(store.customDomain);

    if (!verified) {
      await storeRepository.updateById(storeId, {
        customDomainStatus: CustomDomainStatus.PENDING,
      });
      logger.warn("store_cname_not_propagated", {
        event: "store_cname_not_propagated",
        service: SERVICE_NAME,
        storeId,
        customDomain: store.customDomain,
      });
      throw AppError.badRequest(
        "CNAME not yet propagated. Retry in a few minutes.",
      );
    }

    const customRouteId = `store-custom-${randomUUID()}`;

    await caddyService.registerRoute(customRouteId, store.customDomain, false);

    const updated = await storeRepository.updateById(storeId, {
      customDomainStatus: CustomDomainStatus.VERIFIED,
      customDomainVerifiedAt: new Date(),
      caddyCustomRouteId: customRouteId,
    });
    if (!updated) throw AppError.notFound("Store not found.");

    requestContext.set({ storeId, eventType: "store.domain.verified" });

    logger.info("store_custom_domain_verified", {
      event: "store_custom_domain_verified",
      service: SERVICE_NAME,
      storeId,
      customDomain: store.customDomain,
    });

    return toDto(updated);
  },

  async removeCustomDomain(
    storeId: string,
    organizationId: string,
  ): Promise<StoreResponseDto> {
    const store = await storeRepository.findById(storeId);
    if (!store) throw AppError.notFound("Store not found.");

    if (store.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to update this store.",
      );
    }

    if (store.caddyCustomRouteId) {
      await caddyService
        .deregisterRoute(store.caddyCustomRouteId)
        .catch((err) => {
          logger.warn("caddy_custom_route_deregistration_failed", {
            event: "caddy_custom_route_deregistration_failed",
            service: SERVICE_NAME,
            storeId,
            caddyCustomRouteId: store.caddyCustomRouteId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    const updated = await storeRepository.updateById(storeId, {
      customDomain: undefined,
      customDomainStatus: CustomDomainStatus.NONE,
      customDomainVerifiedAt: undefined,
      caddyCustomRouteId: undefined,
    });
    if (!updated) throw AppError.notFound("Store not found.");

    logger.info("store_custom_domain_removed", {
      event: "store_custom_domain_removed",
      service: SERVICE_NAME,
      storeId,
    });

    return toDto(updated);
  },

  async deleteStore(storeId: string, organizationId: string): Promise<void> {
    const store = await storeRepository.findById(storeId);
    if (!store) throw AppError.notFound("Store not found.");

    if (store.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to delete this store.",
      );
    }

    if (store.caddyRouteId) {
      await caddyService.deregisterRoute(store.caddyRouteId).catch((err) => {
        logger.warn("caddy_subdomain_deregistration_failed", {
          event: "caddy_subdomain_deregistration_failed",
          service: SERVICE_NAME,
          storeId,
          caddyRouteId: store.caddyRouteId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    if (store.caddyCustomRouteId) {
      await caddyService
        .deregisterRoute(store.caddyCustomRouteId)
        .catch((err) => {
          logger.warn("caddy_custom_deregistration_failed", {
            event: "caddy_custom_deregistration_failed",
            service: SERVICE_NAME,
            storeId,
            caddyCustomRouteId: store.caddyCustomRouteId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    await storeRepository.deleteById(storeId);

    requestContext.set({ storeId, eventType: "store.deleted" });

    logger.info("store_deleted", {
      event: "store_deleted",
      service: SERVICE_NAME,
      storeId,
    });
  },
};