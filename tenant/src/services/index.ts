import { TenantRepository } from "../repository/TenantRepository";
import { TenantService } from "./tenant.service";

const tenantRepo = new TenantRepository();
export const tenantService = new TenantService(tenantRepo);