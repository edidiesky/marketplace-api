import type { Channel, ConsumeMessage } from "amqplib";
import {
  SERVICE_NAME,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constants";
import { requestContext } from "../../context/requestContext";
import logger             from "../../utils/logger";
import { auditService }   from "../../domains/audit/audit.service";
import {
  AuditAction,
  AuditSource,
} from "../../domains/audit/audit.model";

type HandlerFn = (
  data:    unknown,
  channel: Channel,
  msg:     ConsumeMessage
) => Promise<void>;

interface AuditEventMapping {
  action:        AuditAction;
  source:        AuditSource;
  getActorId?:   (data: Record<string, unknown>) => string | undefined;
  getResourceId?: (data: Record<string, unknown>) => string | undefined;
  getResourceType?: () => string;
  getStoreId?:   (data: Record<string, unknown>) => string | undefined;
  getSagaId?:    (data: Record<string, unknown>) => string | undefined;
}

const EVENT_MAP: Record<string, AuditEventMapping> = {
  "user.registered": {
    action:          AuditAction.USER_REGISTERED,
    source:          AuditSource.AUTHENTICATION,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["userId"] as string,
    getResourceType: () => "user",
  },
  "user.login": {
    action:          AuditAction.USER_LOGIN,
    source:          AuditSource.AUTHENTICATION,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["userId"] as string,
    getResourceType: () => "user",
  },
  "user.logout": {
    action:          AuditAction.USER_LOGOUT,
    source:          AuditSource.AUTHENTICATION,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["userId"] as string,
    getResourceType: () => "user",
  },
  "user.password.reset": {
    action:          AuditAction.USER_PASSWORD_RESET,
    source:          AuditSource.AUTHENTICATION,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["userId"] as string,
    getResourceType: () => "user",
  },
  "organization.created": {
    action:          AuditAction.ORGANIZATION_CREATED,
    source:          AuditSource.ORGANIZATION,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["organizationId"] as string,
    getResourceType: () => "organization",
  },
  "organization.updated": {
    action:          AuditAction.ORGANIZATION_UPDATED,
    source:          AuditSource.ORGANIZATION,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["organizationId"] as string,
    getResourceType: () => "organization",
  },
  "store.created": {
    action:          AuditAction.STORE_CREATED,
    source:          AuditSource.STORES,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["storeId"] as string,
    getResourceType: () => "store",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "store.updated": {
    action:          AuditAction.STORE_UPDATED,
    source:          AuditSource.STORES,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["storeId"] as string,
    getResourceType: () => "store",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "store.status.changed": {
    action:          AuditAction.STORE_STATUS_CHANGED,
    source:          AuditSource.STORES,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["storeId"] as string,
    getResourceType: () => "store",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "order.created": {
    action:          AuditAction.ORDER_CREATED,
    source:          AuditSource.ORDERS,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "order",
    getStoreId:      (d) => d["storeId"] as string,
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "order.completed": {
    action:          AuditAction.ORDER_COMPLETED,
    source:          AuditSource.ORDERS,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "order",
    getStoreId:      (d) => d["storeId"] as string,
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "order.failed": {
    action:          AuditAction.ORDER_FAILED,
    source:          AuditSource.ORDERS,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "order",
    getStoreId:      (d) => d["storeId"] as string,
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "order.abandoned": {
    action:          AuditAction.ORDER_ABANDONED,
    source:          AuditSource.ORDERS,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "order",
    getStoreId:      (d) => d["storeId"] as string,
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "payment.completed": {
    action:          AuditAction.PAYMENT_COMPLETED,
    source:          AuditSource.PAYMENT,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "payment",
    getStoreId:      (d) => d["storeId"] as string,
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "payment.failed": {
    action:          AuditAction.PAYMENT_FAILED,
    source:          AuditSource.PAYMENT,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "payment",
    getStoreId:      (d) => d["storeId"] as string,
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "payment.refunded": {
    action:          AuditAction.PAYMENT_REFUNDED,
    source:          AuditSource.PAYMENT,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "payment",
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "inventory.reservation.failed": {
    action:          AuditAction.INVENTORY_RESERVATION_FAILED,
    source:          AuditSource.INVENTORY,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["orderId"] as string,
    getResourceType: () => "inventory",
    getStoreId:      (d) => d["storeId"] as string,
    getSagaId:       (d) => d["sagaId"] as string,
  },
  "review.created": {
    action:          AuditAction.REVIEW_CREATED,
    source:          AuditSource.REVIEW,
    getActorId:      (d) => d["userId"] as string,
    getResourceId:   (d) => d["reviewId"] as string,
    getResourceType: () => "review",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "review.approved": {
    action:          AuditAction.REVIEW_APPROVED,
    source:          AuditSource.REVIEW,
    getResourceId:   (d) => d["reviewId"] as string,
    getResourceType: () => "review",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "review.rejected": {
    action:          AuditAction.REVIEW_REJECTED,
    source:          AuditSource.REVIEW,
    getResourceId:   (d) => d["reviewId"] as string,
    getResourceType: () => "review",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "payout.requested": {
    action:          AuditAction.PAYOUT_REQUESTED,
    source:          AuditSource.PAYMENT,
    getActorId:      (d) => d["sellerId"] as string,
    getResourceId:   (d) => d["payoutRequestId"] as string,
    getResourceType: () => "payout",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "payout.approved": {
    action:          AuditAction.PAYOUT_APPROVED,
    source:          AuditSource.PAYMENT,
    getActorId:      (d) => d["adminId"] as string,
    getResourceId:   (d) => d["payoutRequestId"] as string,
    getResourceType: () => "payout",
    getStoreId:      (d) => d["storeId"] as string,
  },
  "payout.rejected": {
    action:          AuditAction.PAYOUT_REJECTED,
    source:          AuditSource.PAYMENT,
    getActorId:      (d) => d["adminId"] as string,
    getResourceId:   (d) => d["payoutRequestId"] as string,
    getResourceType: () => "payout",
    getStoreId:      (d) => d["storeId"] as string,
  },
};

function buildHandler(routingKey: string): HandlerFn {
  return async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const mapping = EVENT_MAP[routingKey];

    if (!mapping) {
      logger.warn("audit_handler_no_mapping", {
        event:      "audit_handler_no_mapping",
        service:    SERVICE_NAME,
        routingKey,
        requestId:  requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    const d = data as Record<string, unknown>;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await auditService.createLog({
          action:       mapping.action,
          source:       mapping.source,
          actorId:      mapping.getActorId?.(d),
          resourceId:   mapping.getResourceId?.(d),
          resourceType: mapping.getResourceType?.(),
          storeId:      mapping.getStoreId?.(d),
          sagaId:       mapping.getSagaId?.(d),
          requestId:    requestContext.get()?.requestId,
          payload:      d,
        });

        logger.info("audit_handler_success", {
          event:      "audit_handler_success",
          service:    SERVICE_NAME,
          routingKey,
          action:     mapping.action,
          requestId:  requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("audit_handler_attempt_failed", {
          event:      "audit_handler_attempt_failed",
          service:    SERVICE_NAME,
          routingKey,
          attempt:    attempt + 1,
          error:      message,
          requestId:  requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  };
}

export const auditHandlers: Record<string, HandlerFn> = Object.fromEntries(
  Object.keys(EVENT_MAP).map((key) => [key, buildHandler(key)])
);