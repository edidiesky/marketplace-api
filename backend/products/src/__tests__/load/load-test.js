import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { randomItem, randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const STAGE = __ENV.STAGE || "load";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "Bearer <your-test-jwt-here>";

const STORE_ID = __ENV.STORE_ID || "64b0000000000000000000a1";

// Stages 

const STAGES = {
  smoke: [
    { duration: "1m", target: 1 },
  ],
  load: [
    { duration: "30s", target: 10 },   
    { duration: "3m", target: 150 },  
    { duration: "30s", target: 0 }, 
  ],
  stress: [
    { duration: "1m", target: 150 },  
    { duration: "2m", target: 300 }, 
    { duration: "2m", target: 600 },   
    { duration: "1m", target: 0 },
  ],
  soak: [
    { duration: "10m", target: 50 },
  ],
};

export const options = {
  stages: STAGES[STAGE] || STAGES.load,

  thresholds: {
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: true }],
    "product_read_duration":   ["p(95)<100"], 
    "product_list_duration":   ["p(95)<200"],
    "product_create_duration": ["p(95)<300"],

    // Business-level success rates
    "product_create_success":  ["rate>0.97"],
    "product_read_success":    ["rate>0.99"],
  },
};

// Custom metrics 

const productReadDuration   = new Trend("product_read_duration",   true);
const productListDuration   = new Trend("product_list_duration",   true);
const productCreateDuration = new Trend("product_create_duration", true);
const productCreateSuccess  = new Rate("product_create_success");
const productReadSuccess    = new Rate("product_read_success");
const cacheHitInferred      = new Counter("cache_hit_inferred"); 

let createdProductIds = [];

export function setup() {
  // Seed some products before load test starts so read tests have data
  const ids = [];
  const headers = {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  };

  for (let i = 0; i < 20; i++) {
    const res = http.post(
      `${BASE_URL}/products/api/v1/products/${STORE_ID}/store`,
      JSON.stringify({
        name: `Load Test Product ${i}-${Date.now()}`,
        price: randomIntBetween(100, 10000),
        images: ["https://cdn.example.com/test.jpg"],
        description: "Created during k6 setup phase for read tests",
        availableStock: 100,
        storeName: "Load Test Store",
      }),
      { headers }
    );

    if (res.status === 201) {
      const body = JSON.parse(res.body);
      ids.push(body._id);
    }
  }

  console.log(`Setup: seeded ${ids.length} products`);
  return { productIds: ids };
}

// Default VU function
export default function (data) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  };

  const roll = Math.random();

  if (roll < 0.70) {
    // 70% — read single product
    readProduct(data.productIds, headers);
  } else if (roll < 0.85) {
    // 15% — list products
    listProducts(headers);
  } else if (roll < 0.95) {
    // 10% — create product
    createProduct(headers, data);
  } else {
    // 5% — update or delete
    manageProduct(data.productIds, headers);
  }

  sleep(Math.random() * 0.9 + 0.1);
}

// Scenario functions 
function readProduct(productIds, headers) {
  if (productIds.length === 0) return;

  const id = randomItem(productIds);
  const start = Date.now();

  const res = http.get(
    `${BASE_URL}/products/api/v1/products/${id}`,
    { headers, tags: { name: "get_single_product" } }
  );

  const duration = Date.now() - start;
  productReadDuration.add(duration);
  productReadSuccess.add(res.status === 200);
  if (duration < 15) {
    cacheHitInferred.add(1);
  }

  check(res, {
    "read: status 200":         (r) => r.status === 200,
    "read: has _id":            (r) => JSON.parse(r.body)?._id !== undefined,
    "read: has name":           (r) => JSON.parse(r.body)?.name !== undefined,
    "read: latency < 200ms":    () => duration < 200,
  });
}

function listProducts(headers) {
  const page = randomIntBetween(1, 3);
  const limit = randomIntBetween(5, 20);
  const start = Date.now();

  const res = http.get(
    `${BASE_URL}/products/api/v1/products/${STORE_ID}/store?page=${page}&limit=${limit}`,
    { headers, tags: { name: "list_products" } }
  );

  const duration = Date.now() - start;
  productListDuration.add(duration);

  check(res, {
    "list: status 200":              (r) => r.status === 200,
    "list: has data.products array": (r) => Array.isArray(JSON.parse(r.body)?.data?.products),
    "list: has totalCount":          (r) => JSON.parse(r.body)?.data?.totalCount !== undefined,
    "list: latency < 400ms":         () => duration < 400,
  });
}

function createProduct(
  headers,
  data
) {
  const uniqueName = `Load Test ${Date.now()}-${randomIntBetween(1, 99999)}`;
  const start = Date.now();

  const res = http.post(
    `${BASE_URL}/products/api/v1/products/${STORE_ID}/store`,
    JSON.stringify({
      name: uniqueName,
      price: randomIntBetween(100, 50000),
      images: ["https://cdn.example.com/load-test.jpg"],
      description: "Product created during load test",
      availableStock: randomIntBetween(1, 200),
      storeName: "Load Test Store",
    }),
    { headers, tags: { name: "create_product" } }
  );

  const duration = Date.now() - start;
  productCreateDuration.add(duration);
  productCreateSuccess.add(res.status === 201);

  if (res.status === 201) {
    const body = JSON.parse(res.body);
    if (body._id) {
      data.productIds.push(body._id);
    }
  }

  check(res, {
    "create: status 201":      (r) => r.status === 201,
    "create: has _id":         (r) => JSON.parse(r.body)?._id !== undefined,
    "create: latency < 500ms": () => duration < 500,
  });
}

function manageProduct(productIds, headers) {
  if (productIds.length === 0) return;
  const manageable = productIds.slice(20);
  if (manageable.length === 0) return;

  const id = randomItem(manageable);

  group("manage product", () => {
    // Update
    const updateRes = http.put(
      `${BASE_URL}/products/api/v1/products/${id}`,
      JSON.stringify({ price: randomIntBetween(100, 10000) }),
      { headers, tags: { name: "update_product" } }
    );

    check(updateRes, {
      "update: status 200 or 400": (r) => r.status === 200 || r.status === 400,
    });
  });
}

export function paginationStress() {
  const headers = {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  };

  for (let page = 1; page <= 10; page++) {
    const start = Date.now();

    const res = http.get(
      `${BASE_URL}/products/api/v1/products/${STORE_ID}/store?page=${page}&limit=10`,
      { headers, tags: { name: "pagination_deep" } }
    );

    const duration = Date.now() - start;
    productListDuration.add(duration);

    check(res, {
      [`page ${page}: status 200`]: (r) => r.status === 200,
      [`page ${page}: < 500ms`]:    () => duration < 500,
    });

    sleep(0.05); // 50ms between pages
  }
}

// Teardown 
export function teardown(data) {
  // Soft-delete all products created during load test to leave DB clean
  const headers = {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  };

  let cleaned = 0;
  for (const id of data.productIds) {
    const res = http.del(
      `${BASE_URL}/products/api/v1/products/${id}`,
      null,
      { headers }
    );
    if (res.status === 200) cleaned++;
  }

  console.log(`Teardown: soft-deleted ${cleaned}/${data.productIds.length} products`);
}

export function handleSummary(data) {
  const metrics = data.metrics;

  const p95Read   = metrics.product_read_duration?.values?.["p(95)"]   ?? "N/A";
  const p95List   = metrics.product_list_duration?.values?.["p(95)"]   ?? "N/A";
  const p95Create = metrics.product_create_duration?.values?.["p(95)"] ?? "N/A";
  const createRate = metrics.product_create_success?.values?.rate       ?? 0;
  const readRate   = metrics.product_read_success?.values?.rate         ?? 0;
  const errorRate  = metrics.http_req_failed?.values?.rate              ?? 0;
  const cacheHits  = metrics.cache_hit_inferred?.values?.count          ?? 0;
  const totalReqs  = metrics.http_reqs?.values?.count                   ?? 0;

  return {
    "product-load-summary.json": JSON.stringify(data, null, 2),
  };
}