import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  NOTIFICATION_STORE_ONBOARDING_COMPLETED_TOPIC,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { storeService } from "../services";
import { IStore } from "../models/Store";
import logger from "../utils/logger";
import { sendStoreMessage } from "../messaging/producer";
import { buildQuery } from "../utils/buildQuery";
import { AppError } from "../utils/AppError";
import { requestContext } from "../context/requestContext";
import { trackError } from "../utils/metrics";
import { AuthenticatedRequest } from "../types";

const CreateStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeData = req.body as Partial<IStore>;

    try {
      const store = await storeService.createStore(userId, storeData);

      requestContext.set({
        storeId: store._id.toString(),
        userId,
        eventType: "store.created",
      });

      logger.info("Store creation handler completed", {
        storeId: store._id.toString(),
        userId,
        eventType: "store.created",
      });

      sendStoreMessage(NOTIFICATION_STORE_ONBOARDING_COMPLETED_TOPIC, {
        notificationId: storeData.notificationId!,
        email: storeData.ownerEmail!,
        name: storeData.ownerName!,
        store: storeData.name!,
        plan: storeData.plan!,
        store_url: `${process.env.WEB_ORIGIN}`,
      }).catch((err) => {
        trackError("notification_send_failed", "createStore", "medium");
        logger.error("Failed to send store creation notification", {
          error: err instanceof Error ? err.message : String(err),
          storeId: store._id.toString(),
          userId,
          email: storeData.ownerEmail,
          eventType: "store.notification.failed",
        });
      });

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({ success: true, data: store });
    } catch (err) {
      const appError = err instanceof AppError ? err : AppError.internal(
        err instanceof Error ? err.message : "Unknown error"
      );
      trackError("store_create_handler_failed", "createStore", "high");
      logger.error("Store creation handler failed", {
        error: appError.message,
        statusCode: appError.statusCode,
        userId,
        eventType: "store.created.failed",
      });
      res.status(appError.statusCode).json({
        success: false,
        status: appError.statusCode,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      });
    }
  }
);

const GetAllStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10 } = req.query;
    const queryFilter = await buildQuery(req);
    const skip = (Number(page) - 1) * Number(limit);

    logger.debug("Fetching store list", {
      page: Number(page),
      limit: Number(limit),
      eventType: "store.list.request",
    });

    const stores = await storeService.getAllStores(
      queryFilter,
      skip,
      Number(limit)
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(stores);
  }
);

const GetSingleStoreStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    requestContext.set({ storeId: id, eventType: "store.fetch" });

    const store = await storeService.getStoreById(id);

    if (!store) {
      const err = AppError.notFound(`Store ${id} not found`);
      logger.warn("Store not found", {
        storeId: id,
        eventType: "store.not_found",
      });
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: store });
  }
);

const UpdateStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const existingStore = await storeService.getStoreById(id);
    if (!existingStore) {
      const err = AppError.notFound("This Store does not exist");
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    requestContext.set({ storeId: id, eventType: "store.updated" });

    const store = await storeService.updateStore(id, req.body as Partial<IStore>);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: store });
  }
);

const DeleteStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const existingStore = await storeService.getStoreById(id);
    if (!existingStore) {
      const err = AppError.notFound("This Store does not exist");
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    requestContext.set({ storeId: id, eventType: "store.deleted" });

    await storeService.deleteStore(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, message: "Store deleted" });
  }
);

const AddCustomDomainHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { customDomain } = req.body;

    if (!customDomain) {
      const err = AppError.badRequest("customDomain is required");
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    requestContext.set({ storeId: id, eventType: "store.domain.add" });

    const store = await storeService.addCustomDomain(id, customDomain);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data: store,
      message: `Point a CNAME record from ${customDomain} to ${process.env.PLATFORM_DOMAIN}. Verification is automatic.`,
    });
  }
);

const VerifyCustomDomainHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    requestContext.set({ storeId: id, eventType: "store.domain.verify" });

    const store = await storeService.verifyAndActivateCustomDomain(id);

    if (!store) {
      const err = AppError.badRequest("CNAME not yet propagated. Retry in a few minutes.");
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: store });
  }
);

const ResolveStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const host = req.query.host as string;

    if (!host) {
      const err = AppError.badRequest("host is required");
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    const platformDomain = process.env.PLATFORM_DOMAIN!;
    let store: IStore | null = null;

    if (host.endsWith(`.${platformDomain}`)) {
      const subdomain = host.replace(`.${platformDomain}`, "");
      logger.debug("Resolving store by subdomain", {
        subdomain,
        host,
        eventType: "store.resolve.subdomain",
      });
      store = await storeService.getStoreBySubdomain(subdomain);
    } else {
      logger.debug("Resolving store by custom domain", {
        host,
        eventType: "store.resolve.domain",
      });
      store = await storeService.getStoreByDomain(host);
    }

    if (!store) {
      const err = AppError.notFound("Store not found");
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    logger.info("Store resolved", {
      storeId: store._id.toString(),
      host,
      eventType: "store.resolved",
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: store });
  }
);

export {
  CreateStoreHandler,
  GetAllStoreHandler,
  GetSingleStoreStoreHandler,
  UpdateStoreHandler,
  DeleteStoreHandler,
  ResolveStoreHandler,
  VerifyCustomDomainHandler,
  AddCustomDomainHandler,
};