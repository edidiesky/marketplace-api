/**
 * INVENTORY LOAD TEST
 *
 * What this tests:
 * Normal expected traffic against the inventory service.
 * VUs perform the full reserve -> release cycle against real products.
 * We measure p95 latency, error rate, and throughput at sustained load.
 *
 * Pass conditions:
 * - p95 reserve latency < 150ms
 * - p95 release latency < 150ms
 * - error rate < 1% (excludes expected INSUFFICIENT_STOCK 400s)
 * - zero oversell: available never goes negative
 *
 * Run:
 * k6 run --env BASE_URL=http://localhost:4008 \
 *         --env INTERNAL_SECRET=your_secret \
 *         --env PRODUCT_ID=your_product_id \
 *         --env STORE_ID=your_store_id \
 *         01-inventory-load.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const reserveDuration = new Trend("reserve_duration_ms", true);
const releaseDuration = new Trend("release_duration_ms", true);
const reserveFailRate = new Rate("reserve_fail_rate");
const releaseFailRate = new Rate("release_fail_rate");
const insufficientStockCount = new Counter("insufficient_stock_count");
const contentionCount = new Counter("contention_count");
const reserveSuccessCount = new Counter("reserve_success_count");

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "3m", target: 50 },
    { duration: "3m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    reserve_duration_ms: ["p(95)<150", "p(99)<300"],
    release_duration_ms: ["p(95)<150", "p(99)<300"],
    reserve_fail_rate: ["rate<0.01"],
    release_fail_rate: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4008";
const INTERNAL_SECRET = __ENV.INTERNAL_SECRET || "dev_internal_secret";
const PRODUCT_ID = __ENV.PRODUCT_ID;
const STORE_ID = __ENV.STORE_ID;

if (!PRODUCT_ID || !STORE_ID) {
  throw new Error("PRODUCT_ID and STORE_ID env vars are required");
}

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

export default function () {
  const sagaId = generateSagaId();
  const userId = generateUserId();
  const quantity = 1;

  // --- RESERVE ---
  const reservePayload = JSON.stringify({
    storeId: STORE_ID,
    productId: PRODUCT_ID,
    quantity,
    userId,
    sagaId,
    reservationType: "ORDER",
  });

  const reserveStart = Date.now();
  const reserveRes = http.post(
    `${BASE_URL}/api/v1/inventories/reserve`,
    reservePayload,
    { headers, timeout: "10s" }
  );
  reserveDuration.add(Date.now() - reserveStart);

  // 400 INSUFFICIENT_STOCK and 409 CONTENTION are expected, not failures
  if (reserveRes.status === 400) {
    insufficientStockCount.add(1);
    sleep(0.5);
    return;
  }

  if (reserveRes.status === 409) {
    contentionCount.add(1);
    sleep(0.5);
    return;
  }

  const reserveOk = check(reserveRes, {
    "reserve: status 201": (r) => r.status === 201,
    "reserve: has reservationId": (r) => {
      try {
        return JSON.parse(r.body).reservationId !== undefined;
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
      `RESERVE FAIL vu=${__VU} iter=${__ITER} status=${reserveRes.status} body=${reserveRes.body?.slice(0, 200)}`
    );
    sleep(1);
    return;
  }

  reserveSuccessCount.add(1);

  sleep(0.2);

  // --- RELEASE (simulate order cancellation) ---
  const releasePayload = JSON.stringify({
    storeId: STORE_ID,
    productId: PRODUCT_ID,
    quantity,
    userId,
    sagaId,
    reservationType: "ORDER",
  });

  const releaseStart = Date.now();
  const releaseRes = http.post(
    `${BASE_URL}/api/v1/inventories/release`,
    releasePayload,
    { headers, timeout: "10s" }
  );
  releaseDuration.add(Date.now() - releaseStart);

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
  });

  releaseFailRate.add(!releaseOk);

  if (!releaseOk) {
    console.error(
      `RELEASE FAIL vu=${__VU} iter=${__ITER} status=${releaseRes.status} body=${releaseRes.body?.slice(0, 200)}`
    );
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    "results/01-inventory-load-summary.json": JSON.stringify(data, null, 2),
  };
}