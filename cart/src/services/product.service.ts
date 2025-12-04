import axios from "axios";

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;

export class ProductReadService {
  static async getProductForCart(productId: string) {
    try {
      const response = await axios.get(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}`,
        {
          timeout: 3000,
          headers: { "X-Internal-Service": "true" },
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) throw new Error("Product not found");
      throw new Error("Failed to fetch product details");
    }
  }

  static async checkStock(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const product = await this.getProductForCart(productId);
    return product.availableStock >= quantity;
  }
}
