import mongoose, { FilterQuery } from "mongoose";
import { ICart } from "../models/Cart";

export interface ICartRepository {
  createCart: (
    data: Partial<ICart>,
    session: mongoose.ClientSession
  ) => Promise<ICart>;
  // cartExists
  getStoreCart: (
    query: FilterQuery<ICart>,
    skip: number,
    limit: number
  ) => Promise<ICart[] | null>;
  getSingleCart: (CartId: string) => Promise<ICart | null>;
  cartExists: (productId: string, userId:string) => Promise<ICart | null>;
  updateCart: (
    data: Partial<ICart>,
    CartId: string
  ) => Promise<ICart | null>;
  deleteCart: (data: string) => Promise<void>;
}
