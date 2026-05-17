import { FulfillmentStatus } from "../domains/order/order.model";

const ALLOWED_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  [FulfillmentStatus.UNFULFILLED]:      [FulfillmentStatus.PREPARING],
  [FulfillmentStatus.PREPARING]:        [FulfillmentStatus.DISPATCHED],
  [FulfillmentStatus.DISPATCHED]:       [FulfillmentStatus.IN_TRANSIT],
  [FulfillmentStatus.IN_TRANSIT]:       [FulfillmentStatus.OUT_FOR_DELIVERY],
  [FulfillmentStatus.OUT_FOR_DELIVERY]: [
    FulfillmentStatus.DELIVERED,
    FulfillmentStatus.DELIVERY_FAILED,
  ],
  [FulfillmentStatus.DELIVERED]:        [],
  [FulfillmentStatus.DELIVERY_FAILED]:  [FulfillmentStatus.RETURNED],
  [FulfillmentStatus.RETURNED]:         [],
};

export function isValidFulfillmentTransition(
  prevStatus: FulfillmentStatus,
  currStatus: FulfillmentStatus
): boolean {
  return ALLOWED_TRANSITIONS[prevStatus]?.includes(currStatus) ?? false;
}