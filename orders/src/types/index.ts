import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    role: string;
    userId: string;
    name: string; 
    permissions: Permission[];
    roleLevel?: RoleLevel;
  };
};


export enum RoleLevel {
  SUPER_ADMIN = 1,
  EXECUTIVE = 2,
  DIRECTORATE_HEAD = 3,
  MEMBER = 4,
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
  MANAGE_ROLES = "MANAGE_ROLES",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_REPORTS = "VIEW_REPORTS",
}

export interface CreateCategoryInput {
  name: string;
  value: string;
}

export enum CartItemStatus {
  AVAILABLE = "available",
  OUT_OF_STOCK = "out_of_stock",
  PRICE_CHANGED = "price_changed",
  DISCONTINUED = "discontinued",
}


export interface ICartItems {
  productId: string;
  productTitle: string;
  productDescription: string;
  productPrice: number;
  productQuantity: number;
  reservedAt: Date;
  productImage: string[];
  availabilityStatus: CartItemStatus;
  unavailabilityReason?: string;
}

export interface ICart {
  _id: any;
  userId: string;
  sellerId: string;
  storeId: string;
  fullName: string;
  quantity: number;
  totalPrice: number;
  cartItems: ICartItems[];
  createdAt: Date;
  updatedAt: Date;
  expireAt: Date;
  version: number;
}
