import { customerRepository } from "./customer.repository";
import { ICustomer } from "./customer.model";
import { CustomerResponseDto, CustomerListResponseDto } from "./customer.dto";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

function toDto(customer: ICustomer): CustomerResponseDto {
  return {
    _id:             customer._id.toString(),
    storeId:         customer.storeId.toString(),
    email:           customer.email,
    name:            customer.name,
    totalSpent:      customer.totalSpent,
    orderCount:      customer.orderCount,
    firstPurchaseAt: customer.firstPurchaseAt,
    lastPurchaseAt:  customer.lastPurchaseAt,
    createdAt:       customer.createdAt,
  };
}

export const customerService = {
  async upsertOnPayment(params: {
    storeId: string;
    email:   string;
    name:    string;
    amount:  number;
    userId?: string;
    purchasedAt: Date;
  }): Promise<void> {
    const customer = await customerRepository.upsertOnPayment(params);

    logger.info("customer_upserted", {
      event:      "customer_upserted",
      service:    SERVICE_NAME,
      storeId:    params.storeId,
      customerId: customer._id.toString(),
      orderCount: customer.orderCount,
      totalSpent: customer.totalSpent,
    });
  },

  async getStoreCustomers(
    storeId: string,
    page: number,
    limit: number
  ): Promise<CustomerListResponseDto> {
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      customerRepository.findByStore(storeId, skip, limit),
      customerRepository.countByStore(storeId),
    ]);

    return {
      customers: customers.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },
};