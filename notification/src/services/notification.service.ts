import { measureDatabaseQuery } from "../utils/metrics";
import redisClient from "../config/redis";
import Notification, { INotification } from "../models/Notification";
import { FilterQuery, Types } from "mongoose";

// @description Create a Notification
const CreateNotificationService = async (
  user: string,
  store: string,
  body: Partial<INotification>
): Promise<INotification> => {
  const NotificationData = {
    user: new Types.ObjectId(user),
    store: new Types.ObjectId(store),
    ...body,
  };
  const notification = await measureDatabaseQuery("create_Notification", () =>
    Notification.create(NotificationData)
  );
  return notification;
};

// @description Get All Notifications
const GetAllStoreNotificationService = async (
  query: FilterQuery<INotification>,
  skip: number,
  limit: number
): Promise<INotification[]> => {
  const redisKey = `Notification:search:${JSON.stringify({
    ...query,
    skip,
    limit,
  })}`;
  const cachedNotification = await redisClient.get(redisKey);
  if (cachedNotification) {
    return JSON.parse(cachedNotification);
  }
  const Notifications = await measureDatabaseQuery("fetch_all_Notifications", () =>
    Notification.find(query).skip(skip).limit(limit).sort("-createdAt").lean()
  );
  await redisClient.set(redisKey, JSON.stringify(Notifications), "EX", 3600);
  return Notifications;
};

// @description Get A Single Notification
const GetASingleNotificationService = async (
  id: string
): Promise<INotification | null> => {
  const redisKey = `Notification:${id}`;
  const cachedNotification = await redisClient.get(redisKey);
  if (cachedNotification) {
    return JSON.parse(cachedNotification);
  }
  const notification = await measureDatabaseQuery("fetch_single_Notification", ()=> Notification.findById(id));
  if (notification) {
    await redisClient.set(redisKey, JSON.stringify(notification), "EX", 3600);
  }
  return notification;
};

// @description Update a Notification
const UpdateNotificationService = async (
  NotificationId: string,
  body: Partial<INotification>
): Promise<INotification | null> => {
  const notification = await Notification.findByIdAndUpdate(
    NotificationId,
    { $set: body },
    { new: true, runValidators: true }
  );
  return notification;
};

// @description Delete a Notification
const DeleteNotificationService = async (id: string): Promise<string> => {
  const redisKey = `Notification:${id}`;
  await Notification.findByIdAndDelete(id);
  //   await sendMessage("inventory.Notification_removed", { Notification: id });
  await redisClient.del(redisKey);
  return "Notification has been deleted";
};

export {
  CreateNotificationService,
  GetAllStoreNotificationService,
  GetASingleNotificationService,
  UpdateNotificationService,
  DeleteNotificationService,
};
