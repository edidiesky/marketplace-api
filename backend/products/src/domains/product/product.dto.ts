import { IProductColor, IProductSize } from "./product.model";

export interface CreateProductDto {
  ownerId:        string;
  organizationId: string;
  storeId:        string;
  ownerName?:     string;
  storeName?:     string;
  name:           string;
  description?:   string;
  price:          number;
  images?:        string[];
  category?:      string[];
  colors?:        IProductColor[];
  size?:          IProductSize[];
  sku?:           string;
  stockQuantity?: number;
}

export interface UpdateProductDto {
  name?:        string;
  description?: string;
  price?:       number;
  images?:      string[];
  category?:    string[];
  colors?:      IProductColor[];
  size?:        IProductSize[];
  isArchive?:   boolean;
  sku?:         string;
}

export interface ProductListQueryDto {
  storeId?:   string;
  category?:  string;
  isArchive?: boolean;
  page:       number;
  limit:      number;
}

export interface ProductResponseDto {
  productId:      string;
  ownerId:        string;
  organizationId: string;
  storeId:        string;
  ownerName?:     string;
  storeName?:     string;
  name:           string;
  description?:   string;
  price:          number;
  images:         string[];
  category:       string[];
  colors:         IProductColor[];
  size:           IProductSize[];
  sku?:           string;
  isArchive:      boolean;
  isDeleted:      boolean;
  createdAt:      Date;
  updatedAt:      Date;
}

export interface ProductListResponseDto {
  products:   ProductResponseDto[];
  totalCount: number;
  totalPages: number;
  page:       number;
  limit:      number;
}