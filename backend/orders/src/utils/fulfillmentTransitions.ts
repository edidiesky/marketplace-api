import { FulfillmentStatus } from "../models/Order";

export const fulfillmentTransitions = ({
  prevStatus,
  currStatus,
}: {
  prevStatus: FulfillmentStatus;
  currStatus: FulfillmentStatus;
}) => {
  const validStates: Record<FulfillmentStatus, FulfillmentStatus[]> = {
    [FulfillmentStatus.UNFULFILLED]: [FulfillmentStatus.PREPARING],
    [FulfillmentStatus.PREPARING]: [FulfillmentStatus.DISPATCHED],
    [FulfillmentStatus.DISPATCHED]: [
      FulfillmentStatus.IN_TRANSIT,
      FulfillmentStatus.DELIVERY_FAILED,
    ],
    [FulfillmentStatus.OUT_FOR_DELIVERY]: [
      FulfillmentStatus.DELIVERED,
      FulfillmentStatus.DELIVERY_FAILED,
    ],
    [FulfillmentStatus.IN_TRANSIT]: [
      FulfillmentStatus.OUT_FOR_DELIVERY,
      FulfillmentStatus.DELIVERY_FAILED,
    ],
    [FulfillmentStatus.DELIVERED]: [],
    [FulfillmentStatus.DELIVERY_FAILED]: [
      FulfillmentStatus.IN_TRANSIT,
      FulfillmentStatus.RETURNED,
    ],
    [FulfillmentStatus.RETURNED]: [],
  };

  return validStates[prevStatus]?.includes(currStatus) ?? false;
};
