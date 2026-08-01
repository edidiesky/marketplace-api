import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProductSale extends Document {
  _id:       Types.ObjectId;
  productId: Types.ObjectId;
  storeId:   Types.ObjectId;
  quantity:  number;
  soldAt:    Date;
}

const ProductSaleSchema = new Schema<IProductSale>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    storeId:   { type: Schema.Types.ObjectId, required: true },
    quantity:  { type: Number, required: true, min: 1 },
    soldAt:    { type: Date, required: true, default: Date.now },
  },
  { timestamps: false } 
);

ProductSaleSchema.index({ storeId: 1, productId: 1, soldAt: -1 });
ProductSaleSchema.index({ storeId: 1, soldAt: -1 });

export default mongoose.model<IProductSale>("ProductSale", ProductSaleSchema);