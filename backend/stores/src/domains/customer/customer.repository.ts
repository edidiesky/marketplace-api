import Customer, { ICustomer } from "./customer.model";
import { Types } from "mongoose";

export const customerRepository = {
  async upsertOnPayment(params: {
    storeId: string;
    email:   string;
    name:    string;
    amount:  number;
    userId?: string;
    purchasedAt: Date;
  }): Promise<ICustomer> {
    const { storeId, email, name, amount, userId, purchasedAt } = params;

    const customer = await Customer.findOneAndUpdate(
      {
        storeId: new Types.ObjectId(storeId),
        email:   email.toLowerCase().trim(),
      },
      {
        $inc: {
          totalSpent: amount,
          orderCount: 1,
        },
        $max: {
          lastPurchaseAt: purchasedAt,
        },
        $setOnInsert: {
          storeId:         new Types.ObjectId(storeId),
          email:           email.toLowerCase().trim(),
          firstPurchaseAt: purchasedAt,
          ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
        },
        $set: { name },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return customer;
  },

  async findByStore(
    storeId: string,
    skip: number,
    limit: number
  ): Promise<ICustomer[]> {
    return Customer.find({ storeId: new Types.ObjectId(storeId) })
      .sort({ lastPurchaseAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ICustomer[]>()
      .exec();
  },

  async countByStore(storeId: string): Promise<number> {
    return Customer.countDocuments({ storeId: new Types.ObjectId(storeId) });
  },
};