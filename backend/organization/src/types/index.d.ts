import { AuthenticatedUser } from ".";
import { Permission, RoleLevel } from "../models/User";
import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser
    }
  }
}
