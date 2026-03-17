/**
 * CDC Event Builder
 *
 * Transforms raw MongoDB change stream documents into a clean,
 * versioned event format that the inventory service and any future
 * consumer can depend on without knowing MongoDB internals.
 *
 * Why a separate builder:
 *   - Change stream documents contain raw BSON types (ObjectId, Date etc.)
 *   - Consumers are Node.js services — they expect plain JSON
 *   - If the event shape needs to change, change it here only
 *   - Versioned with `eventVersion` so consumers can handle schema evolution
 */

import {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  ChangeStreamUpdateDocument,
  ChangeStreamDeleteDocument,
  ChangeStreamReplaceDocument,
} from "mongodb";

// Event Types

export type CDCOperation = "INSERT" | "UPDATE" | "DELETE" | "REPLACE";

export interface ProductCDCEvent {
  eventVersion: "1.0";
  // Event identity
  eventId: string;
  operation: CDCOperation;
  occurredAt: string; // ISO8601 — when the change happened in MongoDB
  publishedAt: string; // ISO8601 — when this event was built

  // Which service produced this
  source: "products-service-change-stream";

  // Product data
  productId: string;
  storeId: string | null;
  ownerId: string | null;
  fullDocument: ProductSnapshot | null;

  updatedFields: Record<string, any> | null;
  removedFields: string[] | null;
  resumeToken: string;
}

export interface ProductSnapshot {
  productId: string;
  storeId: string;
  ownerId: string;
  tenantId: string | null;
  name: string;
  storeName: string;
  storeDomain: string | null;
  ownerName: string;
  price: number;
  description: string | null;
  images: string[];
  category: string[];
  isDeleted: boolean;
  isArchive: boolean;
  availableStock: number | null;
  thresholdStock: number | null;
  trackInventory: boolean;
  sku: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Normalizers
/**
 * MongoDB stores ObjectIds and Dates as BSON types.
 * After .watch() in Node.js driver, they come as ObjectId instances and Date instances.
 * We serialize them to plain strings for JSON.
 */
function toStr(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value.toString) return value.toString();
  return null;
}

function toIso(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function buildProductSnapshot(doc: any): ProductSnapshot {
  return {
    productId: toStr(doc._id)!,
    storeId: toStr(doc.store)!,
    ownerId: toStr(doc.ownerId)!,
    tenantId: doc.tenantId ?? null,
    name: doc.name ?? "",
    storeName: doc.storeName ?? "",
    storeDomain: doc.storeDomain ?? null,
    ownerName: doc.ownerName ?? "",
    price: typeof doc.price === "number" ? doc.price : 0,
    description: doc.description ?? null,
    images: Array.isArray(doc.images) ? doc.images : [],
    category: Array.isArray(doc.category) ? doc.category : [],
    isDeleted: doc.isDeleted ?? false,
    isArchive: doc.isArchive ?? false,
    availableStock: doc.availableStock ?? null,
    thresholdStock: doc.thresholdStock ?? null,
    trackInventory: doc.trackInventory ?? true,
    sku: doc.sku ?? null,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

function buildEventId(
  productId: string,
  operation: CDCOperation,
  ts: number,
): string {
  return `${productId}:${operation}:${ts}`;
}

// Main Builder

export function buildCDCEvent(
  change: ChangeStreamDocument,
): ProductCDCEvent | null {
  const resumeToken = JSON.stringify(change._id);
  const publishedAt = new Date().toISOString();

  //  INSERT
  if (change.operationType === "insert") {
    const doc = (change as ChangeStreamInsertDocument).fullDocument;
    if (!doc) return null;

    const productId = toStr(doc._id)!;
    const ts = (change.clusterTime as any)?.valueOf() ?? Date.now();

    return {
      eventVersion: "1.0",
      eventId: buildEventId(productId, "INSERT", ts),
      operation: "INSERT",
      occurredAt: new Date(ts).toISOString(),
      publishedAt,
      source: "products-service-change-stream",
      productId,
      storeId: toStr(doc.store),
      ownerId: toStr(doc.ownerId),
      fullDocument: buildProductSnapshot(doc),
      updatedFields: null,
      removedFields: null,
      resumeToken,
    };
  }

  //  UPDATE
  if (change.operationType === "update") {
    const update = change as ChangeStreamUpdateDocument;
    const doc = update.fullDocument;
    const productId = toStr(update.documentKey?._id)!;
    const ts = (change.clusterTime as any)?.valueOf() ?? Date.now();

    return {
      eventVersion: "1.0",
      eventId: buildEventId(productId, "UPDATE", ts),
      operation: "UPDATE",
      occurredAt: new Date(ts).toISOString(),
      publishedAt,
      source: "products-service-change-stream",
      productId,
      storeId: doc ? toStr(doc.store) : null,
      ownerId: doc ? toStr(doc.ownerId) : null,
      fullDocument: doc ? buildProductSnapshot(doc) : null,
      updatedFields: update.updateDescription?.updatedFields
        ? normalizeUpdatedFields(update.updateDescription.updatedFields)
        : null,
      removedFields: update.updateDescription?.removedFields ?? null,
      resumeToken,
    };
  }

  //  DELETE
  if (change.operationType === "delete") {
    const del = change as ChangeStreamDeleteDocument;
    const productId = toStr(del.documentKey?._id)!;
    const ts = (change.clusterTime as any)?.valueOf() ?? Date.now();

    return {
      eventVersion: "1.0",
      eventId: buildEventId(productId, "DELETE", ts),
      operation: "DELETE",
      occurredAt: new Date(ts).toISOString(),
      publishedAt,
      source: "products-service-change-stream",
      productId,
      storeId: null,
      ownerId: null,
      fullDocument: null,
      updatedFields: null,
      removedFields: null,
      resumeToken,
    };
  }

  //  REPLACE
  if (change.operationType === "replace") {
    const rep = change as ChangeStreamReplaceDocument;
    const doc = rep.fullDocument;
    const productId = toStr(rep.documentKey?._id)!;
    const ts = (change.clusterTime as any)?.valueOf() ?? Date.now();

    return {
      eventVersion: "1.0",
      eventId: buildEventId(productId, "REPLACE", ts),
      operation: "REPLACE",
      occurredAt: new Date(ts).toISOString(),
      publishedAt,
      source: "products-service-change-stream",
      productId,
      storeId: doc ? toStr(doc.store) : null,
      ownerId: doc ? toStr(doc.ownerId) : null,
      fullDocument: doc ? buildProductSnapshot(doc) : null,
      updatedFields: null,
      removedFields: null,
      resumeToken,
    };
  }
  return null;
}

/**
 * Normalize updatedFields — convert BSON types to plain values.
 */
function normalizeUpdatedFields(
  fields: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (
      value !== null &&
      typeof value === "object" &&
      value.toString &&
      value.constructor.name === "ObjectId"
    ) {
      result[key] = value.toString();
    } else {
      result[key] = value;
    }
  }
  return result;
}
