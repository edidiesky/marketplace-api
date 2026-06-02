import mongoose, { FilterQuery, Types } from "mongoose";
import Organization, { IOrganization }  from "./organization.model";
import redisClient                      from "../../config/redis";
import logger                           from "../../utils/logger";
import { SERVICE_NAME }                 from "../../constant";

const CACHE_TTL = 3_600;

function cacheKey(id: string): string {
  return `organization:id:${id}`;
}

function ownerCacheKey(ownerId: string): string {
  return `organization:owner:${ownerId}`;
}

async function bust(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redisClient.del(...keys);
  } catch (err) {
    logger.warn("organization_cache_bust_failed", {
      event:   "organization_cache_bust_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}

export const organizationRepository = {
  async create(
    data:     Partial<IOrganization>,
    session?: mongoose.ClientSession
  ): Promise<IOrganization> {
    const [org] = await Organization.create(
      [data],
      session ? { session } : {}
    );

    logger.info("organization_document_created", {
      event:          "organization_document_created",
      service:        SERVICE_NAME,
      organizationId: org._id.toString(),
      ownerId:        org.ownerId.toString(),
    });

    return org;
  },

  async findById(id: string): Promise<IOrganization | null> {
    const key = cacheKey(id);
    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached) as IOrganization;
    } catch {}

    const org = await Organization.findById(id).lean<IOrganization>().exec();

    if (org) {
      try {
        await redisClient.set(key, JSON.stringify(org), "EX", CACHE_TTL);
      } catch {}
    }

    return org;
  },

  async findByOwnerId(ownerId: string): Promise<IOrganization | null> {
    const key = ownerCacheKey(ownerId);
    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached) as IOrganization;
    } catch {}

    const org = await Organization.findOne({
      ownerId: new Types.ObjectId(ownerId),
    })
      .lean<IOrganization>()
      .exec();

    if (org) {
      try {
        await redisClient.set(key, JSON.stringify(org), "EX", CACHE_TTL);
      } catch {}
    }

    return org;
  },

  async findAll(
    query: FilterQuery<IOrganization>,
    skip:  number,
    limit: number
  ): Promise<IOrganization[]> {
    return Organization.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IOrganization[]>()
      .exec();
  },

  async count(query: FilterQuery<IOrganization>): Promise<number> {
    return Organization.countDocuments(query).exec();
  },

  async updateById(
    id:   string,
    data: Partial<IOrganization>
  ): Promise<IOrganization | null> {
    const org = await Organization.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .lean<IOrganization>()
      .exec();

    if (org) {
      await bust(cacheKey(id), ownerCacheKey(org.ownerId.toString()));
    }

    return org;
  },

  async existsByOwnerId(ownerId: string): Promise<boolean> {
    const count = await Organization.countDocuments({
      ownerId: new Types.ObjectId(ownerId),
    }).exec();
    return count > 0;
  },
};