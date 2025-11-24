import { ITenantRepository } from "../repository/ITenantRepository";
import { ITenant } from "../models/Tenant";
import { FilterQuery, Types } from "mongoose";
import { TenantRepository } from "../repository/TenantRepository";

export class TenantService {
  private tenantRepo: ITenantRepository
  constructor() {
    this.tenantRepo = new TenantRepository()
  }
   /**
   * @description Create Tenant method
   * @param userId 
   * @param body
   * @returns 
   */
  async createTenant(userId: string, body: Partial<ITenant>): Promise<ITenant> {
    return this.tenantRepo.create({
      ownerId: new Types.ObjectId(userId),
      ...body,
    });
  }

  /**
   * @description Get all Tenant method
   * @param query 
   * @param skip 
   * @param limit 
   * @returns 
   */
  async getAllTenants(
    query: FilterQuery<ITenant>,
    skip: number,
    limit: number
  ): Promise<ITenant[]> {
    return this.tenantRepo.findAll(query, skip, limit);
  }

   /**
   * @description Get single Tenant method
   * @param query id
   * @returns 
   */
  async getTenantById(id: string): Promise<ITenant | null> {
    return this.tenantRepo.findById(id);
  }

   /**
   * @description update single Tenant method
   * @param id 
   * @param body
   * @returns 
   */
  async updateTenant(
    id: string,
    body: Partial<ITenant>
  ): Promise<ITenant | null> {
    return this.tenantRepo.update(id, body);
  }

  async deleteTenant(id: string): Promise<void> {
    return this.tenantRepo.delete(id);
  }
}
