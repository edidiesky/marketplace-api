import mongoose, { FilterQuery } from "mongoose";
import { IProduct } from "../models/Product";

export interface IProductRepository {
  createProduct: (
    data: Partial<IProduct>,
    session: mongoose.ClientSession
  ) => Promise<IProduct>;
  findProductById: (id: string) => Promise<IProduct | null>;
  updateProduct: (id: string, data: Partial<IProduct>) => Promise<IProduct | null>;
  deleteproductById: (id: string) => void;
  findAllProduct: (
    queryParams: FilterQuery<IProduct>,
    skip: number,
    limit: number
  ) => Promise<IProduct[]>;
}

