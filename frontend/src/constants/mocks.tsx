export interface StatBlock {
  id: string;
  label: string;
  value: string;
  sub: string;
  progress: number;
  delta: string;
  deltaPositive: boolean;
  deltaNote: string;
}

export interface RecentOrder {
  id: string;
  customer: string;
  orderId: string;
  date: string;
  time: string;
  type: string;
  amount: string;
  status: "pending" | "completed" | "failed" | "refunded";
}

export interface RevenueDataPoint {
  x: string;
  y: number;
}

export const statBlocks: StatBlock[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "₦1,248,500",
    sub: "483 of 521 orders",
    progress: 93,
    delta: "12%",
    deltaPositive: true,
    deltaNote: "Compared to previous 30 days",
  },
  {
    id: "orders",
    label: "Pending Orders",
    value: "7%",
    sub: "36 of 521 orders",
    progress: 7,
    delta: "18%",
    deltaPositive: false,
    deltaNote: "Compared to previous 30 days",
  },
  {
    id: "cancelled",
    label: "Cancelled Orders",
    value: "0%",
    sub: "2 of 521 orders",
    progress: 0,
    delta: "9%",
    deltaPositive: false,
    deltaNote: "Compared to previous 30 days",
  },
];

export const recentOrders: RecentOrder[] = [
  { id: "1", customer: "Temi Adeyemi",  orderId: "#TX987XYZ654LMN", date: "02 Apr, 2026", time: "03:45:18 PM", type: "Refund",   amount: "₦18,500", status: "pending"   },
  { id: "2", customer: "Kola Balogun",  orderId: "#TX765FRT321CVB", date: "10 Apr, 2026", time: "08:12:55 AM", type: "Transfer", amount: "₦45,000", status: "failed"    },
  { id: "3", customer: "Ngozi Okafor",  orderId: "#TX234ABC987DEF", date: "15 Apr, 2026", time: "11:30:00 AM", type: "Payment",  amount: "₦9,200",  status: "completed" },
  { id: "4", customer: "Emeka Eze",     orderId: "#TX456GHI321JKL", date: "18 Apr, 2026", time: "02:15:44 PM", type: "Payment",  amount: "₦22,000", status: "completed" },
  { id: "5", customer: "Aisha Mohammed",orderId: "#TX678MNO654PQR", date: "21 Apr, 2026", time: "09:05:10 AM", type: "Refund",   amount: "₦5,700",  status: "refunded"  },
];

export const revenueSeriesData: RevenueDataPoint[] = [
  { x: "Nov", y: 410000 },
  { x: "Dec", y: 780000 },
  { x: "Jan", y: 520000 },
  { x: "Feb", y: 630000 },
  { x: "Mar", y: 910000 },
  { x: "Apr", y: 1248500 },
];

export const budgetSeriesThisYear = [410, 620, 780, 520, 890, 1248];
export const budgetSeriesLastYear = [310, 490, 600, 440, 710, 980];
export const budgetCategories = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];