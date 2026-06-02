import { FilterQuery } from "mongoose";
import Notification, {
  INotification,
  NotificationStatus,
} from "./notification.model";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

export const notificationRepository = {
  async create(data: Partial<INotification>): Promise<INotification> {
    const notification = await Notification.create(data);
    logger.info("notification_created", {
      event:          "notification_created",
      service:        SERVICE_NAME,
      notificationId: notification._id.toString(),
      type:           notification.type,
      channel:        notification.channel,
    });
    return notification;
  },

  async markSent(id: string): Promise<void> {
    await Notification.findByIdAndUpdate(id, {
      $set: { status: NotificationStatus.SENT, sentAt: new Date() },
    }).exec();
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await Notification.findByIdAndUpdate(id, {
      $set: { status: NotificationStatus.FAILED, errorMessage },
    }).exec();
  },

  async findAll(
    query: FilterQuery<INotification>,
    skip:  number,
    limit: number
  ): Promise<INotification[]> {
    return Notification.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean<INotification[]>()
      .exec();
  },

  async count(query: FilterQuery<INotification>): Promise<number> {
    return Notification.countDocuments(query).exec();
  },

  async findById(id: string): Promise<INotification | null> {
    return Notification.findById(id).lean<INotification>().exec();
  },

  async updateById(
    id:   string,
    data: Partial<INotification>
  ): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    )
      .lean<INotification>()
      .exec();
  },

  async deleteById(id: string): Promise<void> {
    await Notification.findByIdAndDelete(id).exec();
  },
};