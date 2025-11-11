import { measureDatabaseQuery } from "../utils/metrics";
import redisClient from "../config/redis";
import Tenant, { ITenant } from "../models/Tenant";
import { FilterQuery, Types } from "mongoose";
import logger from "@/utils/logger";

// @description Create a Tenant
const CreateTenantService = async (
  user: string,
  body: Partial<ITenant>
): Promise<ITenant> => {
  const TenantData = {
    user: new Types.ObjectId(user),
    ...body,
  };
  const tenant = await measureDatabaseQuery("create_Tenant", () =>
    Tenant.create(TenantData)
  );
  return tenant;
};

// @description Get All Tenants
const GetAllStoreTenantService = async (
  query: FilterQuery<ITenant>,
  skip: number,
  limit: number
): Promise<ITenant[]> => {
  const redisKey = `tenant:search:${JSON.stringify({
    ...query,
    skip,
    limit,
  })}`;
  const cachedTenant = await redisClient.get(redisKey);
  if (cachedTenant) {
    return JSON.parse(cachedTenant);
  }
  const tenants = await measureDatabaseQuery("fetch_all_Tenants", () =>
    Tenant.find(query).skip(skip).limit(limit).sort("-createdAt").lean()
  );
  await redisClient.set(redisKey, JSON.stringify(tenants), "EX", 3600);
  return tenants;
};

// @description Get A Single Tenant
const GetASingleTenantService = async (id: string): Promise<ITenant | null> => {
  const redisKey = `Tenant:${id}`;
  const cachedTenant = await redisClient.get(redisKey);
  if (cachedTenant) {
    return JSON.parse(cachedTenant);
  }
  const tenant = await measureDatabaseQuery("fetch_single_Tenant", () =>
    Tenant.findById(id)
  );
  if (tenant) {
    logger.info("Cache single tenant:", { tenant: tenant?._id });
    await redisClient.set(redisKey, JSON.stringify(tenant), "EX", 3600);
  }
  return tenant;
};

// @description Update a Tenant
const UpdateTenantService = async (
  TenantId: string,
  body: Partial<ITenant>
): Promise<ITenant | null> => {
  const tenant = await Tenant.findByIdAndUpdate(
    TenantId,
    { $set: body },
    { new: true, runValidators: true }
  );
  return tenant;
};

// @description Delete a Tenant
const DeleteTenantService = async (id: string): Promise<string> => {
  const redisKey = `Tenant:${id}`;
  await Tenant.findByIdAndDelete(id);
  //   await sendMessage("inventory.Tenant_removed", { Tenant: id });
  await redisClient.del(redisKey);
  return "Tenant has been deleted";
};

export {
  CreateTenantService,
  GetAllStoreTenantService,
  GetASingleTenantService,
  UpdateTenantService,
  DeleteTenantService,
};
