import request from "supertest";
import mongoose from "mongoose";
import Review from "../../models/Review";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
const API = "/api/v1/reviews";

let userToken: string;
let storeOwnerToken: string;
let adminToken: string;
let userId: string;
let storeOwnerId: string;
let adminId: string;
let productId = new mongoose.Types.ObjectId();
let storeId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI!);

  // Create test users
  const user = await User.create({
    name: "Victor Customer",
    email: "victor@test.com",
    password: "password123",
  });
  const storeOwner = await User.create({
    name: "TechStore Owner",
    email: "owner@techstore.ng",
    password: "password123",
    role: "store_owner",
  });
  const admin = await User.create({
    name: "Admin NG",
    email: "admin@marketplace.ng",
    password: "password123",
    role: "admin",
  });

  userId = user._id.toString();
  storeOwnerId = storeOwner._id.toString();
  adminId = admin._id.toString();

  userToken = generateToken(userId, "user");
  storeOwnerToken = generateToken(storeOwnerId, "store_owner");
  adminToken = generateToken(adminId, "admin");

  // Create store
  await Store.create({
    _id: storeId,
    ownerId: storeOwnerId,
    name: "Tech Store NG",
    subdomain: "techstore",
    storeName: "Tech Store NG",
  });
});

afterAll(async () => {
  await Review.deleteMany({});
  await User.deleteMany({ email: { $in: ["victor@test.com", "owner@techstore.ng", "admin@marketplace.ng"] } });
  await Store.deleteMany({ subdomain: "techstore" });
  await mongoose.connection.close();
});

describe("Review System - Integration Tests", () => {
  it("should create a review (verified purchase)", async () => {
    const res = await request(app)
      .post(API)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        productId: productId.toString(),
        orderId: new mongoose.Types.ObjectId().toString(),
        rating: 5,
        title: "Best phone in Nigeria!",
        comment: "Bought from Lagos, arrived in 2 days. 100% legit!",
        images: ["https://res.cloudinary.com/demo/image1.jpg"],
        isVerifiedPurchase: true,
        productTitle: "iPhone 15 Pro",
        productImage: "https://example.com/iphone.jpg",
        storeId: storeId.toString(),
        storeName: "Tech Store NG",
        reviewerName: "Victor Okeke",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("approved");
    expect(res.body.data.rating).toBe(5);
  });

  it("should get product reviews with stats", async () => {
    const res = await request(app)
      .get(`${API}/product/${productId}`)
      .query({ limit: 5, page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.reviews).toBeDefined();
    expect(res.body.data.stats.averageRating).toBeGreaterThanOrEqual(1);
    expect(res.body.data.stats.totalReviews).toBe(1);
  });

  it("should allow store owner to respond", async () => {
    const review = await Review.findOne({ rating: 5 });

    const res = await request(app)
      .post(`${API}/${review!._id}/respond`)
      .set("Authorization", `Bearer ${storeOwnerToken}`)
      .send({ text: "Thank you Victor! Enjoy your new iPhone" });

    expect(res.status).toBe(200);
    expect(res.body.data.response.text).toContain("Thank you");
  });

  it("should allow user to mark helpful", async () => {
    const review = await Review.findOne({ rating: 5 });

    const res = await request(app)
      .post(`${API}/${review!._id}/helpful`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ helpful: true });

    expect(res.status).toBe(200);
    expect(res.body.data.helpfulCount).toBe(1);
  });

  it("should allow admin to approve pending review", async () => {
    const pendingReview = await Review.create({
      productId,
      storeId,
      userId,
      orderId: new mongoose.Types.ObjectId(),
      rating: 4,
      title: "Good but battery drains fast",
      comment: "Works well but battery could be better",
      productTitle: "Samsung S24",
      storeName: "Tech Store NG",
      reviewerName: "Victor Okeke",
      isVerifiedPurchase: false,
      status: "pending",
    });

    const res = await request(app)
      .patch(`${API}/${pendingReview._id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
  });

  it("should block unauthorized response", async () => {
    const review = await Review.findOne({ rating: 5 });

    const res = await request(app)
      .post(`${API}/${review!._id}/respond`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ text: "Not your store!" });

    expect(res.status).toBe(403);
  });
});