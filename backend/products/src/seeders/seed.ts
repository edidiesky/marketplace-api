/**
 * Selleasi Standalone Seed Script
 *
 * Usage:
 *   ts-node seed.ts
 *   ts-node seed.ts --destroy   <- wipes all seeded data first
 *
 * Env vars required (create a .env.seed in the same folder):
 *   AUTH_DATABASE_URL=mongodb+srv://...
 *   PRODUCTS_DATABASE_URL=mongodb+srv://...
 *   STORES_DATABASE_URL=mongodb+srv://...
 *   KAFKA_BROKERS=localhost:9092,localhost:9093,localhost:9094
 *   JWT_CODE=your_jwt_secret
 *   BCRYPT_ROUNDS=12
 */

import mongoose, { Connection, Schema, Types } from "mongoose";
import { Kafka, Producer } from "kafkajs";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.seed") });

//  CONFIG 

const SEED_COUNT       = 4;
const BCRYPT_ROUNDS    = Number(process.env.BCRYPT_ROUNDS ?? 12);
const DESTROY_MODE     = process.argv.includes("--destroy");
const DEFAULT_PASSWORD = "Password@123";

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:9092")
  .split(",")
  .map((b) => b.trim());

const AUTH_DB_URL     = process.env.AUTH_DATABASE_URL!;
const PRODUCTS_DB_URL = process.env.PRODUCTS_DATABASE_URL!;
const STORES_DB_URL   = process.env.STORES_DATABASE_URL!;

const USER_ONBOARDING_COMPLETED_TOPIC = "user.onboarding.completed.topic";

//  ENUMS 

enum UserType {
  SELLERS  = "SELLERS",
  ADMIN    = "ADMIN",
  INVESTORS= "INVESTORS",
  CUSTOMER = "CUSTOMER",
}

enum TenantType {
  SELLER_INDIVIDUAL = "SELLER_INDIVIDUAL",
  SELLER_BUSINESS   = "SELLER_BUSINESS",
  MARKETPLACE       = "MARKETPLACE",
  FRANCHISE         = "FRANCHISE",
}

enum BillingPlan {
  FREE       = "FREE",
  PRO        = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

enum TenantStatus {
  DRAFT     = "DRAFT",
  ACTIVE    = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED   = "DELETED",
}

//  SCHEMAS (inline, no service imports needed) 

const UserSchema = new Schema(
  {
    userType:               { type: String, enum: Object.values(UserType), required: true },
    email:                  { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:                  { type: String, required: true },
    passwordHash:           { type: String, required: true },
    firstName:              { type: String, trim: true },
    lastName:               { type: String, trim: true },
    profileImage:           { type: String },
    gender:                 { type: String },
    isEmailVerified:        { type: Boolean, default: false },
    falseIdentificationFlag:{ type: Boolean, default: false },
    tenantId:               { type: String },
    tenantType:             { type: String, enum: Object.values(TenantType) },
    tenantStatus:           { type: String, enum: Object.values(TenantStatus), default: TenantStatus.DRAFT },
    tenantPlan:             { type: String, enum: Object.values(BillingPlan), default: BillingPlan.FREE },
    trialEndsAt:            { type: Date },
    currentPeriodEndsAt:    { type: Date },
    cancelAtPeriodEnd:      { type: Boolean, default: false },
    lastActiveAt:           { type: Date },
    _seedTag:               { type: String },  // marks seeded docs for idempotency + destroy
  },
  { timestamps: true }
);

const StoreSchema = new Schema(
  {
    ownerId:     { type: Schema.Types.ObjectId, required: true },
    ownerName:   { type: String },
    tenantId:    { type: String },
    name:        { type: String, required: true, unique: true },
    description: { type: String },
    domain:      { type: String, unique: true },
    logo:        { type: String },
    currency:    { type: String, default: "NGN" },
    country:     { type: String, default: "Nigeria" },
    isActive:    { type: Boolean, default: true },
    _seedTag:    { type: String },
  },
  { timestamps: true }
);

const ProductSchema = new Schema(
  {
    ownerId:        { type: Schema.Types.ObjectId, required: true },
    ownerName:      { type: String },
    store:          { type: Schema.Types.ObjectId, required: true },
    tenantId:       { type: String },
    storeName:      { type: String },
    name:           { type: String, required: true, unique: true },
    description:    { type: String },
    price:          { type: Number, required: true, min: 0 },
    images:         [{ type: String }],
    availableStock: { type: Number, default: 0 },
    thresholdStock: { type: Number, default: 10 },
    trackInventory: { type: Boolean, default: true },
    isDeleted:      { type: Boolean, default: false },
    isArchive:      { type: Boolean, default: false },
    _seedTag:       { type: String },
  },
  { timestamps: true }
);

//  SEED DATA 

const SEED_TAG = "selleasi_seed_v1";

const customerSeeds = Array.from({ length: SEED_COUNT }, (_, i) => ({
  userType:        UserType.CUSTOMER,
  email:           `customer${i + 1}@selleasi.dev`,
  phone:           `0801000000${i + 1}`,
  firstName:       `Customer`,
  lastName:        `User${i + 1}`,
  isEmailVerified: true,
  _seedTag:        SEED_TAG,
}));

const sellerSeeds = Array.from({ length: SEED_COUNT }, (_, i) => ({
  userType:        UserType.SELLERS,
  email:           `seller${i + 1}@selleasi.dev`,
  phone:           `0802000000${i + 1}`,
  firstName:       `Seller`,
  lastName:        `Owner${i + 1}`,
  isEmailVerified: true,
  tenantType:      TenantType.SELLER_INDIVIDUAL,
  billingPlan:     BillingPlan.FREE,
  _seedTag:        SEED_TAG,
}));

const adminSeeds = Array.from({ length: SEED_COUNT }, (_, i) => ({
  userType:        UserType.ADMIN,
  email:           `admin${i + 1}@selleasi.dev`,
  phone:           `0803000000${i + 1}`,
  firstName:       `Admin`,
  lastName:        `User${i + 1}`,
  isEmailVerified: true,
  _seedTag:        SEED_TAG,
}));

const investorSeeds = Array.from({ length: SEED_COUNT }, (_, i) => ({
  userType:        UserType.INVESTORS,
  email:           `investor${i + 1}@selleasi.dev`,
  phone:           `0804000000${i + 1}`,
  firstName:       `Investor`,
  lastName:        `User${i + 1}`,
  isEmailVerified: true,
  _seedTag:        SEED_TAG,
}));

const storeSeedData = (ownerId: Types.ObjectId, ownerName: string, index: number) => ({
  ownerId,
  ownerName,
  name:        `Selleasi Store ${index + 1}`,
  description: `Official seed store number ${index + 1} for testing`,
  domain:      `store-${index + 1}.selleasi.dev`,
  logo:        `https://placehold.co/200x200?text=Store${index + 1}`,
  currency:    "NGN",
  country:     "Nigeria",
  isActive:    true,
  _seedTag:    SEED_TAG,
});

const productSeedData = (
  storeId: Types.ObjectId,
  ownerId: Types.ObjectId,
  ownerName: string,
  storeName: string,
  tenantId: string,
  storeIndex: number,
  productIndex: number
) => ({
  ownerId,
  ownerName,
  store:          storeId,
  tenantId,
  storeName,
  name:           `Product ${productIndex + 1} from Store ${storeIndex + 1}`,
  description:    `This is seed product ${productIndex + 1} from ${storeName}. Great quality, fast delivery.`,
  price:          Math.floor(Math.random() * 50000) + 1000,
  images:         [`https://placehold.co/400x400?text=Product${productIndex + 1}`],
  availableStock: Math.floor(Math.random() * 100) + 10,
  thresholdStock: 10,
  trackInventory: true,
  isDeleted:      false,
  _seedTag:       SEED_TAG,
});

//  CONNECTIONS 

async function connectDB(url: string, name: string): Promise<Connection> {
  const conn = await mongoose.createConnection(url).asPromise();
  console.log(`[DB] Connected to ${name}`);
  return conn;
}

//  KAFKA 

async function connectKafka(): Promise<{ producer: Producer; kafka: Kafka }> {
  const kafka = new Kafka({
    clientId: "selleasi-seed-script",
    brokers:  KAFKA_BROKERS,
    retry:    { initialRetryTime: 500, retries: 5 },
  });
  const producer = kafka.producer();
  await producer.connect();
  console.log("[Kafka] Producer connected");
  return { producer, kafka };
}

async function emitSellerOnboarding(
  producer: Producer,
  seller: any
): Promise<void> {
  await producer.send({
    topic:    USER_ONBOARDING_COMPLETED_TOPIC,
    messages: [
      {
        key:   seller._id.toString(),
        value: JSON.stringify({
          ownerId:    seller._id.toString(),
          ownerEmail: seller.email,
          ownerName:  `${seller.firstName} ${seller.lastName}`,
          type:       TenantType.SELLER_INDIVIDUAL,
          billingPlan:BillingPlan.FREE,
        }),
        headers: {
          "content-type": "application/json",
          "seed-script":  "true",
        },
      },
    ],
  });
  console.log(`[Kafka] Emitted USER_ONBOARDING_COMPLETED for ${seller.email}`);
}

//  DESTROY 

async function destroySeededData(
  authConn: Connection,
  storesConn: Connection,
  productsConn: Connection
): Promise<void> {
  console.log("\n[Destroy] Removing all seeded data...");

  const UserModel     = authConn.model("User", UserSchema);
  const StoreModel    = storesConn.model("Store", StoreSchema);
  const ProductModel  = productsConn.model("Product", ProductSchema);

  const users    = await UserModel.deleteMany({ _seedTag: SEED_TAG });
  const stores   = await StoreModel.deleteMany({ _seedTag: SEED_TAG });
  const products = await ProductModel.deleteMany({ _seedTag: SEED_TAG });

  console.log(`[Destroy] Removed ${users.deletedCount} users`);
  console.log(`[Destroy] Removed ${stores.deletedCount} stores`);
  console.log(`[Destroy] Removed ${products.deletedCount} products`);
}

//  SEED USERS 

async function seedUsers(authConn: Connection): Promise<{
  customers: any[];
  sellers:   any[];
  admins:    any[];
  investors: any[];
}> {
  const UserModel  = authConn.model("User", UserSchema);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  const results: { customers: any[]; sellers: any[]; admins: any[]; investors: any[] } = {
    customers: [],
    sellers:   [],
    admins:    [],
    investors: [],
  };

  const allSeeds = [
    { group: "customers" as const, data: customerSeeds },
    { group: "sellers"   as const, data: sellerSeeds   },
    { group: "admins"    as const, data: adminSeeds    },
    { group: "investors" as const, data: investorSeeds },
  ];

  for (const { group, data } of allSeeds) {
    for (const seed of data) {
      // idempotency: skip if email already exists
      const existing = await UserModel.findOne({ email: seed.email });
      if (existing) {
        console.log(`[Users] Skipping existing: ${seed.email}`);
        results[group].push(existing);
        continue;
      }

      const user = await UserModel.create({ ...seed, passwordHash });
      console.log(`[Users] Created ${seed.userType}: ${seed.email}`);
      results[group].push(user);
    }
  }

  return results;
}

//  SEED STORES 
async function seedStores(
  storesConn: Connection,
  sellers: any[]
): Promise<any[]> {
  const StoreModel = storesConn.model("Store", StoreSchema);
  const stores: any[] = [];

  for (let i = 0; i < sellers.length; i++) {
    const seller    = sellers[i];
    const ownerName = `${seller.firstName} ${seller.lastName}`;
    const data      = storeSeedData(seller._id, ownerName, i);

    const existing = await StoreModel.findOne({ domain: data.domain });
    if (existing) {
      console.log(`[Stores] Skipping existing: ${data.domain}`);
      stores.push(existing);
      continue;
    }

    const store = await StoreModel.create(data);
    console.log(`[Stores] Created store: ${store.name} for ${seller.email}`);
    stores.push(store);
  }

  return stores;
}

//  SEED PRODUCTS 
async function seedProducts(
  productsConn: Connection,
  sellers: any[],
  stores: any[]
): Promise<void> {
  const ProductModel = productsConn.model("Product", ProductSchema);

  for (let i = 0; i < stores.length; i++) {
    const store     = stores[i];
    const seller    = sellers[i];
    const ownerName = `${seller.firstName} ${seller.lastName}`;
    const tenantId  = seller.tenantId ?? `pending_${seller._id}`;

    for (let p = 0; p < SEED_COUNT; p++) {
      const data = productSeedData(
        store._id,
        seller._id,
        ownerName,
        store.name,
        tenantId,
        i,
        p
      );

      const existing = await ProductModel.findOne({ name: data.name });
      if (existing) {
        console.log(`[Products] Skipping existing: ${data.name}`);
        continue;
      }

      await ProductModel.create(data);
      console.log(`[Products] Created: ${data.name}`);
    }
  }
}

//  MAIN 

async function main(): Promise<void> {
  console.log("\n========================================");
  console.log(" Selleasi Seed Script");
  console.log(`  Mode:     ${DESTROY_MODE ? "DESTROY + RESEED" : "SEED"}`);
  console.log(`  Count:    ${SEED_COUNT} per category`);
  console.log(`  Password: ${DEFAULT_PASSWORD}`);
  console.log("========================================\n");

  // validate env
  if (!AUTH_DB_URL || !PRODUCTS_DB_URL || !STORES_DB_URL) {
    console.error("[Error] Missing DATABASE_URL env vars. Check your .env.seed file.");
    process.exit(1);
  }

  // connect
  const [authConn, storesConn, productsConn] = await Promise.all([
    connectDB(AUTH_DB_URL,     "auth"),
    connectDB(STORES_DB_URL,   "stores"),
    connectDB(PRODUCTS_DB_URL, "products"),
  ]);

  const { producer } = await connectKafka();

  try {
    // destroy mode wipes seeded data first
    if (DESTROY_MODE) {
      await destroySeededData(authConn, storesConn, productsConn);
      console.log("[Destroy] Done. Reseeding...\n");
    }

    // seed users
    const { customers, sellers, admins, investors } = await seedUsers(authConn);

    console.log(`\n[Summary] Users seeded:`);
    console.log(`  Customers: ${customers.length}`);
    console.log(`  Sellers:   ${sellers.length}`);
    console.log(`  Admins:    ${admins.length}`);
    console.log(`  Investors: ${investors.length}`);

    // emit Kafka events for sellers to trigger tenant saga
    console.log("\n[Kafka] Emitting seller onboarding events...");
    for (const seller of sellers) {
      // only emit if tenant not already provisioned
      if (!seller.tenantId) {
        await emitSellerOnboarding(producer, seller);
      } else {
        console.log(`[Kafka] Skipping ${seller.email} - tenant already provisioned`);
      }
    }

    // seed stores (one per seller)
    console.log("\n[Stores] Seeding stores...");
    const stores = await seedStores(storesConn, sellers);

    // seed products (SEED_COUNT products per store)
    console.log("\n[Products] Seeding products...");
    await seedProducts(productsConn, sellers, stores);

    console.log("\n========================================");
    console.log(" Seed complete");
    console.log(`  Users:    ${customers.length + sellers.length + admins.length + investors.length}`);
    console.log(`  Stores:   ${stores.length}`);
    console.log(`  Products: ${stores.length * SEED_COUNT}`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);
    console.log("  Note: tenant provisioning is async via Kafka saga.");
    console.log("  Sellers will have tenantId populated once the tenant");
    console.log("  service processes USER_ONBOARDING_COMPLETED_TOPIC.");
    console.log("========================================\n");

  } finally {
    await producer.disconnect();
    await authConn.close();
    await storesConn.close();
    await productsConn.close();
    console.log("[Cleanup] All connections closed");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});