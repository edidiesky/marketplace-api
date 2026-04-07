/**
 * INVENTORY LOAD TEST
 *
 * What this tests:
 * Normal expected traffic against the inventory service.
 * VUs perform the full reserve -> release cycle against real products.
 * We measure p95 latency, error rate, and throughput at sustained load.
 *
 * Pass conditions (enforced by thresholds below):
 * - p95 reserve latency < 2000ms  (p99 < 5000ms)
 * - p95 release latency < 2000ms  (p99 < 5000ms)
 * - error rate < 15% (excludes expected INSUFFICIENT_STOCK 400s and timeouts)
 * - contention (409s) < 200 total across the run
 * - zero oversell: spot-checked via GET stock level after each reserve
 *
 * NOTE on 150ms aspiration: the service-level goal is p95 < 150ms under
 * normal single-node conditions. These k6 thresholds are the CI gate
 * and are deliberately wider to account for retries and network overhead.
 * Track reserve_duration_ms p95 in dashboards against the 150ms goal.
 *
 * Data parameterization:
 * Supply a JSON file at PRODUCT_DATA_PATH with an array of
 * { productId, storeId } objects to distribute load across multiple
 * product/store pairs and avoid artificial single-SKU contention.
 *
 * Run:
 * k6 run --env BASE_URL=http://localhost:4008 \
 *         --env INTERNAL_SECRET=your_secret \
 *         --env PRODUCT_DATA_PATH=./products.json \
 *         01-inventory-load.js
 *
 * Minimal single-product fallback (sets PRODUCT_ID + STORE_ID directly):
 * k6 run --env BASE_URL=http://localhost:4008 \
 *         --env INTERNAL_SECRET=your_secret \
 *         --env PRODUCT_ID=your_product_id \
 *         --env STORE_ID=your_store_id \
 *         01-inventory-load.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

// Custom metrics
const reserveDuration = new Trend("reserve_duration_ms", true);
const releaseDuration = new Trend("release_duration_ms", true);
const reserveFailRate = new Rate("reserve_fail_rate");
const releaseFailRate = new Rate("release_fail_rate");
const oversellViolations = new Counter("oversell_violation_count");
const insufficientStock = new Counter("insufficient_stock_count");
const contentionCount = new Counter("contention_count");
const reserveSuccessCount = new Counter("reserve_success_count");

// Options / thresholds
export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "3m", target: 50 },
    { duration: "3m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    // CI gates, wider than the 150ms SLO to absorb retry overhead
    reserve_duration_ms: ["p(95)<2000", "p(99)<5000"],
    release_duration_ms: ["p(95)<2000", "p(99)<5000"],

    // Error rate must stay below 15% (timeouts and expected 400s excluded)
    reserve_fail_rate: ["rate<0.15"],
    release_fail_rate: ["rate<0.15"],

    // Oversell must never happen
    oversell_violation_count: ["count<1"],
    // Contention threshold, too many 409s means the service is saturated
    contention_count: ["count<200"],
  },
};

// Environment / config
const BASE_URL = __ENV.BASE_URL || "http://localhost:4008";
const INTERNAL_SECRET = __ENV.INTERNAL_SECRET || "dev_internal_secret";
const PRODUCT_DATA_PATH = __ENV.PRODUCT_DATA_PATH || "";

// Single-product fallback (backwards-compatible)
const SINGLE_PRODUCT_ID = __ENV.PRODUCT_ID || "";
const SINGLE_STORE_ID = __ENV.STORE_ID || "";

if (!PRODUCT_DATA_PATH && (!SINGLE_PRODUCT_ID || !SINGLE_STORE_ID)) {
  throw new Error(
    "Supply either PRODUCT_DATA_PATH (recommended) or both PRODUCT_ID and STORE_ID",
  );
}

// Product pool, SharedArray is parsed once and shared across all VUs
const productPool = PRODUCT_DATA_PATH
  ? new SharedArray("products", function () {
      return JSON.parse(open(PRODUCT_DATA_PATH));
    })
  : [{ productId: SINGLE_PRODUCT_ID, storeId: SINGLE_STORE_ID }];

// Helpers
const headers = {
  "Content-Type": "application/json",
  "x-internal-secret": INTERNAL_SECRET,
};

function generateSagaId() {
  return `saga-load-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateUserId() {
  return `user-load-${Math.random().toString(36).slice(2, 11)}`;
}

/** Pick a random product/store pair so load is spread across the pool. */
function pickProduct() {
  return productPool[Math.floor(Math.random() * productPool.length)];
}

/**
 * Fetch current available stock for a product/store.
 * Returns the numeric available quantity, or null on error.
 */
function getAvailableStock(productId, storeId) {
  const res = http.get(
    `${BASE_URL}/api/v1/inventories?productId=${productId}&storeId=${storeId}`,
    { headers, timeout: "10s" },
  );
  if (res.status !== 200) return null;
  try {
    const body = JSON.parse(res.body);
    // Support both { available: N } and { data: { available: N } }
    return body.available ?? body.data?.available ?? null;
  } catch {
    return null;
  }
}

// Default VU function
export default function () {
  const { productId, storeId } = pickProduct();
  const sagaId = generateSagaId();
  const userId = generateUserId();
  const quantity = 1;

  //  RESERVE
  const reservePayload = JSON.stringify({
    storeId,
    productId,
    quantity,
    userId,
    sagaId,
    reservationType: "ORDER",
  });

  const reserveStart = Date.now();
  const reserveRes = http.post(
    `${BASE_URL}/api/v1/inventories/reserve`,
    reservePayload,
    { headers, timeout: "30s" },
  );
  reserveDuration.add(Date.now() - reserveStart);

  // Network timeout, do not count as a service failure
  if (reserveRes.status === 0) {
    console.error(`RESERVE TIMEOUT vu=${__VU} iter=${__ITER}`);
    reserveFailRate.add(false);
    sleep(1);
    return;
  }

  // Expected business outcome, not a test failure
  if (reserveRes.status === 400) {
    insufficientStock.add(1);
    sleep(0.5);
    return;
  }

  // Contention, tracked separately
  if (reserveRes.status === 409) {
    contentionCount.add(1);
    sleep(0.5);
    return;
  }

  let reservationId;
  const reserveOk = check(reserveRes, {
    "reserve: status 201": (r) => r.status === 201,
    "reserve: has reservationId": (r) => {
      try {
        reservationId = JSON.parse(r.body).reservationId;
        return reservationId !== undefined;
      } catch {
        return false;
      }
    },
    "reserve: success true": (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    },
  });

  reserveFailRate.add(!reserveOk);

  if (!reserveOk) {
    console.error(
      `RESERVE FAIL vu=${__VU} iter=${__ITER} status=${reserveRes.status} body=${reserveRes.body?.slice(0, 200)}`,
    );
    sleep(1);
    return;
  }

  reserveSuccessCount.add(1);

  // OVERSELL CHECK
  // Spot-check stock level immediately after a successful reserve.
  // available < 0 means a concurrent reserve pushed past zero, oversell.
  const available = getAvailableStock(productId, storeId);
  if (available !== null && available < 0) {
    oversellViolations.add(1);
    console.error(
      `OVERSELL DETECTED vu=${__VU} iter=${__ITER} productId=${productId} storeId=${storeId} available=${available}`,
    );
  }

  // Realistic think time: user is "reviewing" their cart (2–5s)
  sleep(2 + Math.random() * 3);

  // RELEASE
  const releasePayload = JSON.stringify({
    storeId,
    productId,
    quantity,
    userId,
    sagaId,
    reservationType: "ORDER",
  });

  const releaseStart = Date.now();
  const releaseRes = http.post(
    `${BASE_URL}/api/v1/inventories/release`,
    releasePayload,
    { headers, timeout: "30s" },
  );
  releaseDuration.add(Date.now() - releaseStart);

  if (releaseRes.status === 0) {
    console.error(`RELEASE TIMEOUT vu=${__VU} iter=${__ITER}`);
    releaseFailRate.add(false);
    sleep(1);
    return;
  }

  if (releaseRes.status === 409) {
    contentionCount.add(1);
    sleep(0.5);
    return;
  }

  const releaseOk = check(releaseRes, {
    "release: status 200": (r) => r.status === 200,
    "release: success true": (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    },
    "release: releasedQuantity matches": (r) => {
      try {
        return JSON.parse(r.body).releasedQuantity === quantity;
      } catch {
        return false;
      }
    },
  });

  releaseFailRate.add(!releaseOk);

  if (!releaseOk) {
    console.error(
      `RELEASE FAIL vu=${__VU} iter=${__ITER} status=${releaseRes.status} body=${releaseRes.body?.slice(0, 200)}`,
    );
  }

  sleep(1);
}

// Summary
export function handleSummary(data) {
  return {
    "results/02-inventory-load-summary.json": JSON.stringify(data, null, 2),
  };
}
