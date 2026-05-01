import { UserRequestDTO, UserResponseDTO } from "../types";
import { userRepository } from "../respository/user.repository";
import logger from "../utils/logger";

export interface PaginatedUsers {
  data: Partial<UserResponseDTO>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Builds a safe MongoDB filter from the validated query object.
 *
 * firstName and lastName are converted to case-insensitive regex so partial
 * matches work (e.g. "vic" matches "Victor"). All other fields are passed as
 * exact match values. Internal fields that must never reach the DB filter are
 * stripped regardless of what the validator passed through.
 */
function buildUserFilter(
  query: Partial<UserRequestDTO> & { firstName?: string; lastName?: string },
): Record<string, unknown> {
  const {
    passwordHash,
    __v,
    _id,
    ...rest
  } = query as any;

  const filter: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;

    if (key === "firstName" || key === "lastName") {
      filter[key] = { $regex: value, $options: "i" };
    } else {
      filter[key] = value;
    }
  }

  return filter;
}

export class UserService {
  getAllUsers = async (
    requesterId: string,
    rawQuery: Partial<UserRequestDTO>,
    page: number,
    limit: number,
  ): Promise<PaginatedUsers> => {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const filter = buildUserFilter(rawQuery);

    logger.info("user.list.started", {
      event: "user.list.started",
      requesterId,
      filter,
      page: safePage,
      limit: safeLimit,
    });

    const [data, total] = await Promise.all([
      userRepository.findAllUsers(filter, skip, safeLimit),
      userRepository.countAllUsers(filter),
    ]);

    const totalPages = Math.ceil(total / safeLimit);

    logger.info("user.list.completed", {
      event: "user.list.completed",
      requesterId,
      total,
      returned: data.length,
      page: safePage,
      totalPages,
    });

    return {
      data,
      pagination: { page: safePage, limit: safeLimit, total, totalPages },
    };
  };

  getUserById = async (
    requesterId: string,
    targetId: string,
  ): Promise<Partial<UserResponseDTO>> => {
    logger.info("user.get.started", {
      event: "user.get.started",
      requesterId,
      targetId,
    });

    const user = await userRepository.findUserById(targetId);

    if (!user) {
      logger.warn("user.get.not_found", {
        event: "user.get.not_found",
        requesterId,
        targetId,
      });
      const err = new Error("User not found") as any;
      err.statusCode = 404;
      throw err;
    }

    logger.info("user.get.completed", {
      event: "user.get.completed",
      requesterId,
      targetId,
    });

    return user;
  };

  updateUser = async (
    requesterId: string,
    targetId: string,
    dto: Partial<UserRequestDTO>,
  ): Promise<Partial<UserResponseDTO>> => {
    logger.info("user.update.started", {
      event: "user.update.started",
      requesterId,
      targetId,
      fields: Object.keys(dto),
    });

    const existing = await userRepository.findUserById(targetId);

    if (!existing) {
      logger.warn("user.update.not_found", {
        event: "user.update.not_found",
        requesterId,
        targetId,
      });
      const err = new Error("User not found") as any;
      err.statusCode = 404;
      throw err;
    }

    // Strip fields that must never be updated via this endpoint
    const {
      passwordHash,
      email,
      tenantId,
      tenantType,
      tenantStatus,
      tenantPlan,
      __v,
      _id,
      ...safeUpdate
    } = dto as any;

    const currentVersion = (existing as any).__v ?? 0;

    const updated = await userRepository.updateUser(
      targetId,
      safeUpdate,
      currentVersion,
    );

    if (!updated) {
      logger.warn("user.update.version_conflict", {
        event: "user.update.version_conflict",
        requesterId,
        targetId,
        expectedVersion: currentVersion,
      });
      const err = new Error(
        "Update conflict: document was modified by another request. Retry.",
      ) as any;
      err.statusCode = 409;
      throw err;
    }

    logger.info("user.update.completed", {
      event: "user.update.completed",
      requesterId,
      targetId,
      updatedFields: Object.keys(safeUpdate),
    });

    return updated;
  };

  deleteUser = async (
    requesterId: string,
    targetId: string,
  ): Promise<void> => {
    logger.info("user.delete.started", {
      event: "user.delete.started",
      requesterId,
      targetId,
    });

    const existing = await userRepository.findUserById(targetId);

    if (!existing) {
      logger.warn("user.delete.not_found", {
        event: "user.delete.not_found",
        requesterId,
        targetId,
      });
      const err = new Error("User not found") as any;
      err.statusCode = 404;
      throw err;
    }

    const currentVersion = (existing as any).__v ?? 0;

    const deleted = await userRepository.deleteUser(targetId, currentVersion);

    if (!deleted) {
      logger.warn("user.delete.version_conflict", {
        event: "user.delete.version_conflict",
        requesterId,
        targetId,
        expectedVersion: currentVersion,
      });
      const err = new Error(
        "Delete conflict: document was modified by another request. Retry.",
      ) as any;
      err.statusCode = 409;
      throw err;
    }

    logger.info("user.delete.completed", {
      event: "user.delete.completed",
      requesterId,
      targetId,
      deletedEmail: (existing as any).email,
    });
  };

  getAggregatedUsers = async (
    requesterId: string,
  ): Promise<Record<string, unknown>[]> => {
    logger.info("user.aggregate.started", {
      event: "user.aggregate.started",
      requesterId,
    });

    const result = await userRepository.aggregateUsers();

    logger.info("user.aggregate.completed", {
      event: "user.aggregate.completed",
      requesterId,
    });

    return result;
  };
}

export const userService = new UserService();