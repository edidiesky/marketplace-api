import { AuthenticatedUser } from ".";

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser
    }
  }
}
