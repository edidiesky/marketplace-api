import { UserRepository } from "../respository/user.repository"

export class UserAnalyticService {
  private repository: UserRepository
  constructor() {
    this.repository = new UserRepository()
  }
}
export const userAnalyticService = new UserAnalyticService()