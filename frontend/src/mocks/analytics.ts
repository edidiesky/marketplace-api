//  Orders
export const ordersOverTime = [
  { date: "2026-01-01", orders: 120 },
  { date: "2026-02-01", orders: 180 },
  { date: "2026-03-01", orders: 210 },
  { date: "2026-04-01", orders: 160 },
  { date: "2026-05-01", orders: 240 },
  { date: "2026-06-01", orders: 300 },
];
export const ordersByStatus = [
  {
    pending: 84,
    processing: 120,
    completed: 480,
    failed: 36,
    out_of_stock: 20,
  },
];
export const avgOrderValue = [
  { date: "2026-01-01", value: 3100 },
  { date: "2026-02-01", value: 3400 },
  { date: "2026-03-01", value: 3200 },
  { date: "2026-04-01", value: 3800 },
  { date: "2026-05-01", value: 3600 },
  { date: "2026-06-01", value: 4100 },
];
export const fulfillmentRate = [{ fulfilled: 680, unfulfilled: 60 }];
export const ordersByDayOfWeek = [
  { date: "Mon", orders: 48 },
  { date: "Tue", orders: 62 },
  { date: "Wed", orders: 71 },
  { date: "Thu", orders: 58 },
  { date: "Fri", orders: 90 },
  { date: "Sat", orders: 110 },
  { date: "Sun", orders: 42 },
];
export const repeatVsNew = [{ repeat: 340, new: 400 }];

//  Revenue
export const revenueOverTime = [
  { date: "2026-01-01", revenue: 410000 },
  { date: "2026-02-01", revenue: 620000 },
  { date: "2026-03-01", revenue: 780000 },
  { date: "2026-04-01", revenue: 540000 },
  { date: "2026-05-01", revenue: 910000 },
  { date: "2026-06-01", revenue: 1248000 },
];
export const revenueYoY = [
  { date: "2026-01-01", thisYear: 410000, lastYear: 310000 },
  { date: "2026-02-01", thisYear: 620000, lastYear: 490000 },
  { date: "2026-03-01", thisYear: 780000, lastYear: 600000 },
  { date: "2026-04-01", thisYear: 540000, lastYear: 440000 },
  { date: "2026-05-01", thisYear: 910000, lastYear: 710000 },
  { date: "2026-06-01", thisYear: 1248000, lastYear: 980000 },
];
export const topEarningProducts = [
  { label: "Ankara Wrap Dress", revenue: 320000 },
  { label: "Linen Agbada Set", revenue: 275000 },
  { label: "Silk Head Wrap", revenue: 180000 },
  { label: "Kaftan XL", revenue: 154000 },
  { label: "Beaded Clutch", revenue: 92000 },
];
export const revenueByFulfillment = [
  { fulfilled: 980000, dispatched: 160000, pending: 108000 },
];
export const revenueBySegment = [
  { label: "Repeat Buyers", revenue: 720000 },
  { label: "New Buyers", revenue: 528000 },
];
export const monthlyGrowthRate = [
  { date: "2026-02-01", growth: 12 },
  { date: "2026-03-01", growth: 18 },
  { date: "2026-04-01", growth: -8 },
  { date: "2026-05-01", growth: 24 },
  { date: "2026-06-01", growth: 15 },
];

//  Products
export const topSellingProducts = [
  { label: "Ankara Wrap Dress", sold: 84 },
  { label: "Linen Agbada Set", sold: 61 },
  { label: "Silk Head Wrap", sold: 48 },
  { label: "Kaftan XL", sold: 37 },
  { label: "Beaded Clutch", sold: 22 },
];
export const productsByCategory = [{ Women: 24, Men: 18, Accessories: 15 }];
export const stockLevels = [
  { label: "Ankara Wrap Dress", available: 24 },
  { label: "Linen Agbada Set", available: 8 },
  { label: "Silk Head Wrap", available: 41 },
  { label: "Kaftan XL", available: 3 },
  { label: "Beaded Clutch", available: 0 },
];
export const activeVsArchived = [{ active: 52, archived: 5 }];
export const viewToConversion = [
  { date: "2026-01-01", views: 1200, purchases: 84 },
  { date: "2026-02-01", views: 1540, purchases: 110 },
  { date: "2026-03-01", views: 1380, purchases: 96 },
  { date: "2026-04-01", views: 1820, purchases: 140 },
  { date: "2026-05-01", views: 2100, purchases: 168 },
  { date: "2026-06-01", views: 2400, purchases: 200 },
];
export const leastPerformingProducts = [
  { label: "Beaded Clutch", sold: 4 },
  { label: "Kaftan XL", sold: 8 },
  { label: "Linen Kaftan S", sold: 11 },
  { label: "Wax Print Shirt", sold: 14 },
  { label: "Embroidered Cap", sold: 17 },
];

//  Customers
export const newCustomersOverTime = [
  { date: "2026-01-01", customers: 42 },
  { date: "2026-02-01", customers: 68 },
  { date: "2026-03-01", customers: 55 },
  { date: "2026-04-01", customers: 80 },
  { date: "2026-05-01", customers: 94 },
  { date: "2026-06-01", customers: 112 },
];
export const verificationStatus = [{ verified: 820, unverified: 272 }];
export const customerGrowthRate = [
  { date: "2026-02-01", growth: 8 },
  { date: "2026-03-01", growth: 14 },
  { date: "2026-04-01", growth: 6 },
  { date: "2026-05-01", growth: 20 },
  { date: "2026-06-01", growth: 17 },
];
export const retentionRate = [{ retained: 68, churned: 32 }];
export const topCustomersBySpend = [
  { label: "Temi Adeyemi", spend: 84200 },
  { label: "Kola Balogun", spend: 67500 },
  { label: "Ngozi Okafor", spend: 54800 },
  { label: "Emeka Eze", spend: 43200 },
  { label: "Aisha Mohammed", spend: 38900 },
];
export const acquisitionByMonth = [
  { date: "2026-01-01", acquired: 42 },
  { date: "2026-02-01", acquired: 68 },
  { date: "2026-03-01", acquired: 55 },
  { date: "2026-04-01", acquired: 80 },
  { date: "2026-05-01", acquired: 94 },
  { date: "2026-06-01", acquired: 112 },
];

//  Payments
export const paymentSuccessRate = [{ success: 720, failed: 48, refunded: 12 }];
export const paymentsByGateway = [{ paystack: 580, flutterwave: 200 }];
export const paymentVolumeOverTime = [
  { date: "2026-01-01", volume: 380000 },
  { date: "2026-02-01", volume: 590000 },
  { date: "2026-03-01", volume: 740000 },
  { date: "2026-04-01", volume: 510000 },
  { date: "2026-05-01", volume: 880000 },
  { date: "2026-06-01", volume: 1180000 },
];
export const refundRateTrend = [
  { date: "2026-01-01", rate: 1.2 },
  { date: "2026-02-01", rate: 0.8 },
  { date: "2026-03-01", rate: 1.5 },
  { date: "2026-04-01", rate: 0.6 },
  { date: "2026-05-01", rate: 1.1 },
  { date: "2026-06-01", rate: 0.9 },
];
export const avgValueByGateway = [
  { label: "Paystack", avgValue: 4200 },
  { label: "Flutterwave", avgValue: 3800 },
];
export const failedPaymentReasons = [
  { label: "Insufficient funds", count: 24 },
  { label: "Card declined", count: 18 },
  { label: "Network timeout", count: 12 },
  { label: "Invalid details", count: 8 },
  { label: "Bank restriction", count: 6 },
];

//  Inventory
export const lowStockItems = [
  { label: "Kaftan XL", available: 3 },
  { label: "Beaded Clutch", available: 0 },
  { label: "Linen Agbada S", available: 2 },
  { label: "Wax Print Shirt", available: 1 },
];
export const stockStatePerProduct = [
  { label: "Ankara Wrap Dress", available: 24, reserved: 4, onHand: 28 },
  { label: "Linen Agbada Set", available: 8, reserved: 2, onHand: 10 },
  { label: "Silk Head Wrap", available: 41, reserved: 3, onHand: 44 },
  { label: "Kaftan XL", available: 3, reserved: 1, onHand: 4 },
];
export const reorderAlertsOverTime = [
  { date: "2026-01-01", alerts: 2 },
  { date: "2026-02-01", alerts: 1 },
  { date: "2026-03-01", alerts: 4 },
  { date: "2026-04-01", alerts: 3 },
  { date: "2026-05-01", alerts: 2 },
  { date: "2026-06-01", alerts: 5 },
];
export const inventoryTurnoverRate = [
  { label: "Ankara Wrap Dress", turnover: 8.4 },
  { label: "Silk Head Wrap", turnover: 6.1 },
  { label: "Linen Agbada Set", turnover: 4.8 },
  { label: "Kaftan XL", turnover: 2.3 },
  { label: "Beaded Clutch", turnover: 1.1 },
];
export const deadStockItems = [
  { label: "Beaded Clutch", daysSinceLastSale: 38 },
  { label: "Wax Print Shirt", daysSinceLastSale: 34 },
  { label: "Embroidered Cap", daysSinceLastSale: 31 },
];
export const stockAccuracyRate = [
  { date: "2026-01-01", accuracy: 96 },
  { date: "2026-02-01", accuracy: 94 },
  { date: "2026-03-01", accuracy: 97 },
  { date: "2026-04-01", accuracy: 92 },
  { date: "2026-05-01", accuracy: 98 },
  { date: "2026-06-01", accuracy: 95 },
];
