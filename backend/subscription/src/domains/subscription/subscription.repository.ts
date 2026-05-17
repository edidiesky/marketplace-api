import { Document } from "mongoose";
import Subscription, {
  BillingPlan,
  ISubscription,
  SubscriptionStatus,
} from "./subscription.model";

type LeanSubscription = Omit<ISubscription, keyof Document> & {
  _id:       import("mongoose").Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const subscriptionRepository = {
  async create(
    data: Partial<ISubscription>
  ): Promise<ISubscription> {
    return Subscription.create(data);
  },

  async findByOrganizationId(
    organizationId: string
  ): Promise<ISubscription | null> {
    return Subscription.findOne({ organizationId })
      .lean<ISubscription>()
      .exec();
  },

  async updateByOrganizationId(
    organizationId: string,
    update:         Partial<ISubscription>
  ): Promise<ISubscription | null> {
    return Subscription.findOneAndUpdate(
      { organizationId },
      { $set: update },
      { new: true }
    )
      .lean<ISubscription>()
      .exec();
  },

  async existsByOrganizationId(
    organizationId: string
  ): Promise<boolean> {
    const count = await Subscription.countDocuments({ organizationId });
    return count > 0;
  },

  async findExpiredTrials(): Promise<ISubscription[]> {
    return Subscription.find({
      status:      SubscriptionStatus.TRIAL,
      trialEndsAt: { $lt: new Date() },
    })
      .lean<ISubscription[]>()
      .exec();
  },
};