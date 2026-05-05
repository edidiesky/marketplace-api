jest.mock("../../utils/withTransaction", () => ({
  withTransaction: jest
    .fn()
    .mockImplementation((fn: any) => fn({} as IProduct)),
}));

jest.mock("../../models/Product", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
  },
}));

jest.mock("../../models/OutboxEvent", () => ({
  __esModule: true,
  default: {
    create: jest
      .fn<() => Promise<[object]>>()
      .mockResolvedValue([{ _id: "outbox-1" }]),
  },
}));

import {
  beforeEach,
  afterEach,
  describe,
  expect,
  jest,
  it,
} from "@jest/globals";
import mongoose, { FilterQuery } from "mongoose";

import { ProductService } from "../../services/product.service";
import { IProductRepository } from "../../repository/IProductRepository";
import { IProduct } from "../../models/Product";
import Product from "../../models/Product";
import * as withTransactionModule from "../../utils/withTransaction";

//  3. Helpers 

const objectId = () => new mongoose.Types.ObjectId();

function makeProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    _id: objectId(),
    ownerId: objectId(),
    store: objectId(),
    name: "Test Product",
    price: 1000,
    images: ["https://cdn.example.com/img.jpg"],
    description: "A test product",
    ownerName: "Jane Doe",
    storeName: "Jane Store",
    ownerImage: "https://cdn.example.com/avatar.jpg",
    tenantId: "tenant-1",
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    sku: "SKU-001",
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    category: ["Footwear"],
    colors: [{ name: "Black", value: "#000000" }],
    size: [{ name: "UK 42", value: "42" }],
    ...overrides,
  } as IProduct;
}

function makeMockRepo(): jest.Mocked<IProductRepository> {
  return {
    createProduct: jest.fn(),
    findAllProduct: jest.fn(),
    findProductById: jest.fn(),
    updateProduct: jest.fn(),
    deleteproductById: jest.fn(),
    softDeleteProduct: jest.fn(),
    restoreProduct: jest.fn(),
  };
}

//  4. Suite 

describe("ProductService", () => {
  let service: ProductService;
  let repo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the module-level mock to its default pass-through behaviour so
    // every test gets a clean slate without re-declaring the implementation.
    (
      withTransactionModule.withTransaction as jest.MockedFunction<
        typeof withTransactionModule.withTransaction
      >
    ).mockImplementation(async (fn: any) => fn({} as mongoose.ClientSession));

    repo = makeMockRepo();
    service = new ProductService(repo);
  });

  //  CreateProductService 

  describe("CreateProductService", () => {
    it("creates a product and returns it", async () => {
      const userId = objectId().toString();
      const product = makeProduct({
        ownerId: new mongoose.Types.ObjectId(userId),
      });
      repo.createProduct.mockResolvedValueOnce(product);

      const result = await service.CreateProductService(userId, {
        name: product.name,
        price: product.price,
        images: product.images,
        store: product.store,
      });

      expect(result).toEqual(product);
      expect(repo.createProduct).toHaveBeenCalledTimes(1);

      const [callData] = repo.createProduct.mock.calls[0];
      expect((callData as Partial<IProduct>).ownerId?.toString()).toBe(userId);
    });

    it("throws 'Failed to create product' when repository returns null", async () => {
      repo.createProduct.mockResolvedValueOnce(null as any);

      await expect(
        service.CreateProductService(objectId().toString(), {
          name: "X",
          price: 100,
        }),
      ).rejects.toThrow("Failed to create product");
    });

    it("propagates repository errors unchanged", async () => {
      repo.createProduct.mockRejectedValueOnce(
        new Error("Duplicate key: name"),
      );

      await expect(
        service.CreateProductService(objectId().toString(), {
          name: "X",
          price: 100,
        }),
      ).rejects.toThrow("Duplicate key: name");
    });

    it("passes ownerId as ObjectId even when userId is a plain string", async () => {
      const userId = objectId().toString();
      const product = makeProduct();
      repo.createProduct.mockResolvedValueOnce(product);

      await service.CreateProductService(userId, { name: "Y", price: 50 });

      const [callData] = repo.createProduct.mock.calls[0];
      expect(
        (callData as Partial<IProduct>).ownerId,
      ).toBeInstanceOf(mongoose.Types.ObjectId);
    });
  });

  //  getAllProducts 

  describe("getAllProducts", () => {
    it("returns paginated response with correct shape", async () => {
      const products = [makeProduct(), makeProduct()];
      repo.findAllProduct.mockResolvedValueOnce(products);
      jest.mocked(Product.countDocuments).mockResolvedValue(42 as any);

      const result = await service.getAllProducts(
        {} as FilterQuery<IProduct>,
        0,
        10,
      );

      expect(result.success).toBe(true);
      expect(result.data.products).toHaveLength(2);
      expect(result.data.totalCount).toBe(42);
      expect(result.data.totalPages).toBe(5); // Math.ceil(42/10)
    });

    it("calls findAllProduct and countDocuments in parallel", async () => {
      repo.findAllProduct.mockResolvedValueOnce([makeProduct()]);
      jest.mocked(Product.countDocuments).mockResolvedValue(1 as any);

      await service.getAllProducts({} as FilterQuery<IProduct>, 0, 10);

      expect(repo.findAllProduct).toHaveBeenCalledTimes(1);
      expect(Product.countDocuments).toHaveBeenCalledTimes(1);
    });

    it("returns totalPages: 1 when there are zero results", async () => {
      repo.findAllProduct.mockResolvedValueOnce([]);
      jest.mocked(Product.countDocuments).mockResolvedValue(0 as any);

      const result = await service.getAllProducts(
        {} as FilterQuery<IProduct>,
        0,
        10,
      );

      expect(result.data.totalCount).toBe(0);
      expect(result.data.totalPages).toBe(1);
    });

    it("forwards query filter and pagination args to repository", async () => {
      const query = { store: objectId(), isDeleted: false };
      repo.findAllProduct.mockResolvedValueOnce([]);
      jest.mocked(Product.countDocuments).mockResolvedValue(0 as any);

      await service.getAllProducts(query as FilterQuery<IProduct>, 20, 5);

      expect(repo.findAllProduct).toHaveBeenCalledWith(query, 20, 5);
    });
  });

  //  getProductById 

  describe("getProductById", () => {
    it("returns product when found", async () => {
      const product = makeProduct();
      repo.findProductById.mockResolvedValueOnce(product);

      const result = await service.getProductById(product._id.toString());

      expect(result).toEqual(product);
      expect(repo.findProductById).toHaveBeenCalledWith(product._id.toString());
    });

    it("returns null when product does not exist", async () => {
      repo.findProductById.mockResolvedValueOnce(null);

      const result = await service.getProductById(objectId().toString());

      expect(result).toBeNull();
    });
  });

  //  updateProduct 

  describe("updateProduct", () => {
    it("returns updated product", async () => {
      const product = makeProduct();
      const updated = { ...product, name: "Updated Name" };
      repo.updateProduct.mockResolvedValueOnce(updated as IProduct);

      const result = await service.updateProduct(product._id.toString(), {
        name: "Updated Name",
      });

      expect(result?.name).toBe("Updated Name");
      expect(repo.updateProduct).toHaveBeenCalledWith(
        product._id.toString(),
        { name: "Updated Name" },
      );
    });

    it("returns null when product not found", async () => {
      repo.updateProduct.mockResolvedValueOnce(null);

      const result = await service.updateProduct(objectId().toString(), {
        name: "X",
      });

      expect(result).toBeNull();
    });

    it("writes an outbox event after a successful update", async () => {
      const product = makeProduct();
      repo.updateProduct.mockResolvedValueOnce(product);
      const OutboxEvent = (await import("../../models/OutboxEvent")).default;

      await service.updateProduct(product._id.toString(), { price: 999 });

      expect(OutboxEvent.create).toHaveBeenCalledTimes(1);
    });
  });

  //  softDeleteProduct 

  describe("softDeleteProduct", () => {
    it("soft-deletes and returns the updated product", async () => {
      const product = makeProduct();
      const deletedProduct = {
        ...product,
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: objectId(),
      };

      repo.softDeleteProduct.mockResolvedValueOnce(undefined);
      repo.findProductById.mockResolvedValueOnce(deletedProduct as IProduct);

      const userId = objectId().toString();
      const result = await service.softDeleteProduct(
        product._id.toString(),
        userId,
      );

      expect(result.isDeleted).toBe(true);
      expect(repo.softDeleteProduct).toHaveBeenCalledWith(
        product._id.toString(),
        userId,
        expect.anything(), // session
      );
    });

    it("throws when product is not found after soft delete (stale cache)", async () => {
      repo.softDeleteProduct.mockResolvedValueOnce(undefined);
      repo.findProductById.mockResolvedValueOnce(null);

      await expect(
        service.softDeleteProduct(
          objectId().toString(),
          objectId().toString(),
        ),
      ).rejects.toThrow(/not found after soft delete/);
    });

    it("writes an outbox event during soft delete", async () => {
      const product = makeProduct();
      repo.softDeleteProduct.mockResolvedValueOnce(undefined);
      repo.findProductById.mockResolvedValueOnce({
        ...product,
        isDeleted: true,
      } as IProduct);
      const OutboxEvent = (await import("../../models/OutboxEvent")).default;

      await service.softDeleteProduct(
        product._id.toString(),
        objectId().toString(),
      );

      expect(OutboxEvent.create).toHaveBeenCalledTimes(1);
    });
  });

  //  restoreProduct 

  describe("restoreProduct", () => {
    it("returns the restored product", async () => {
      const product = makeProduct({ isDeleted: false });
      repo.restoreProduct.mockResolvedValueOnce(product);

      const result = await service.restoreProduct(product._id.toString());

      expect(result.isDeleted).toBe(false);
      expect(repo.restoreProduct).toHaveBeenCalledWith(
        product._id.toString(),
        expect.anything(), // session injected by withTransaction
      );
    });

    it("throws when product not found during restore", async () => {
      repo.restoreProduct.mockResolvedValueOnce(null);

      await expect(
        service.restoreProduct(objectId().toString()),
      ).rejects.toThrow(/not found/);
    });
  });

  //  deleteProduct 

  describe("deleteProduct", () => {
    it("delegates to repository deleteproductById", async () => {
      const id = objectId().toString();
      repo.deleteproductById.mockResolvedValueOnce(undefined);

      await service.deleteProduct(id);

      expect(repo.deleteproductById).toHaveBeenCalledWith(id);
    });
  });
});