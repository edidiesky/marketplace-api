export interface CreateInventoryDto {
  ownerId:         string;
  organizationId:  string;
  productId:       string;
  storeId:         string;
  ownerName:       string;
  ownerEmail:      string;
  productTitle:    string;
  productImage?:   string;
  storeName:       string;
  storeDomain?:    string;
  warehouseName?:  string;
  quantityOnHand:  number;
  reorderPoint?:   number;
  reorderQuantity?: number;
}

export interface UpdateInventoryDto {
  warehouseName?:   string;
  reorderPoint?:    number;
  reorderQuantity?: number;
}

export interface ReserveStockDto {
  productId: string;
  storeId:   string;
  quantity:  number;
  sagaId:    string;
  userId:    string;
}

export interface ReleaseStockDto {
  productId: string;
  storeId:   string;
  quantity:  number;
  sagaId:    string;
  userId:    string;
}

export interface CommitStockDto {
  productId: string;
  storeId:   string;
  quantity:  number;
  sagaId:    string;
  userId:    string;
}

export interface ExpireReservationDto {
  inventoryId: string;
  quantity:    number;
}

export interface InventoryResponseDto {
  inventoryId:       string;
  ownerId:           string;
  organizationId:    string;
  productId:         string;
  storeId:           string;
  ownerName:         string;
  productTitle:      string;
  storeName:         string;
  warehouseName?:    string;
  quantityOnHand:    number;
  quantityAvailable: number;
  quantityReserved:  number;
  reorderPoint:      number;
  reorderQuantity:   number;
  isLowStock:        boolean;
  createdAt:         Date;
  updatedAt:         Date;
}

export interface InventoryListResponseDto {
  inventories: InventoryResponseDto[];
  totalCount:  number;
  totalPages:  number;
  page:        number;
  limit:       number;
}

export interface StockAvailabilityResponseDto {
  productId:         string;
  storeId:           string;
  quantityAvailable: number;
  quantityOnHand:    number;
  quantityReserved:  number;
  isInStock:         boolean;
}

export interface ReserveStockResponseDto {
  reservationId:      string;
  expiresAt:          string;
  quantityReserved:   number;
  remainingAvailable: number;
}

export interface ReleaseStockResponseDto {
  releasedQuantity:  number;
  newAvailable:      number;
  remainingReserved: number;
}

export interface CommitStockResponseDto {
  committedQuantity: number;
  remainingOnHand:   number;
  remainingReserved: number;
}