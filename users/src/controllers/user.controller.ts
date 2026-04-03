import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { userService } from "../services/user.service";
import { UserRequestDTO } from "../types";
import { userListQuerySchema } from "../validators/user.validator";

export const GetAllUsersHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterId = req.user.userId;

    const { page, limit, ...filters } = req.query;

    const result = await userService.getAllUsers(
      requesterId,
      filters as Partial<UserRequestDTO>,
      Number(page),
      Number(limit),
      // limit,
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const GetSingleUsersHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterId = req.user.userId;
    const { id } = req.params as {id:string};

    const user = await userService.getUserById(requesterId, id);

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const UpdateUserHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterId = req.user.userId;
    const { id } = req.params as {id:string};
    const dto = req.body as Partial<UserRequestDTO>;

    const updated = await userService.updateUser(requesterId, id, dto);

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const DeleteUserHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterId = req.user.userId;
    const { id } = req.params as {id:string};

    await userService.deleteUser(requesterId, id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const GetAggregatedUserHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterId = req.user.userId;

    const data = await userService.getAggregatedUsers(requesterId);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};