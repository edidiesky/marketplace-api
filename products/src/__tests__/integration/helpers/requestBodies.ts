import { v4 } from "uuid";

export function validProductCreateBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const uniqueSuffix = v4().replace(/-/g, "").slice(0, 8);

  return {
    name: `Nike Air Max ${uniqueSuffix}`,
    storeName: "Jane Sneakers",
    storeDomain: "jane-sneakers",
    price: 45000,
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    description: "Classic Air Max silhouette.",
    images: ["https://cdn.example.com/airmax.jpg"],
    category: ["Footwear"],
    colors: [{ name: "Black", value: "#000000" }],
    size: [{ name: "UK Size", value: "42" }],
    ...overrides,
  };
}