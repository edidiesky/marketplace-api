export interface CustomerResponseDto {
  _id:             string;
  storeId:         string;
  email:           string;
  name:            string;
  totalSpent:      number;
  orderCount:      number;
  firstPurchaseAt: Date;
  lastPurchaseAt:  Date;
  createdAt:       Date;
}

export interface CustomerListResponseDto {
  customers:  CustomerResponseDto[];
  totalCount: number;
  totalPages: number;
  page:       number;
  limit:      number;
}