import { FilterQuery, Types } from "mongoose";
import { ITenant } from "../models/Tenant";

export interface ITenantRepository {
  create(data: Partial<ITenant> & { user: Types.ObjectId }): Promise<ITenant>;
  findAll(
    query: FilterQuery<ITenant>,
    skip: number,
    limit: number
  ): Promise<ITenant[]>;
  findById(id: string): Promise<ITenant | null>;
  update(id: string, data: Partial<ITenant>): Promise<ITenant | null>;
  delete(id: string): Promise<void>;
}
