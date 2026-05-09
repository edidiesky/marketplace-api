import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

type FilterOption = { label: string; value: string };

interface DataKey {
  datakey: string;
  color: string;
}

interface BarChartStackedProps {
  title: string;
  description: string;
  data: Array<{ date: number | string; [key: string]: number | string }>;
  chartConfig: ChartConfig;
  dataKeys: DataKey[];
  onFilterChange: (value: string) => void;
  selectedFilter: string;
  filterOptions?: FilterOption[];
  isCurrency?: boolean;
  emptyMessage?: string;
}

const DEFAULT_FILTERS: FilterOption[] = [
  { label: "7 Days",   value: "7-days"   },
  { label: "3 Weeks",  value: "3-weeks"  },
  { label: "3 Months", value: "3-months" },
];

function formatDate(value: number | string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return `₦${(value / 1_000).toFixed(1)}K`;
  return `₦${value}`;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: number | string;
  dataKeys: DataKey[];
  chartConfig: ChartConfig;
  isCurrency: boolean;
}

function CustomTooltip({ active, payload, label, dataKeys, chartConfig, isCurrency }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum, p) => sum + (p?.value ?? 0), 0);

  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid #e8e6e3",
        borderRadius: "10px",
        padding: "14px 16px",
        minWidth: "210px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "0 4px 16px 0 rgba(0,0,0,0.08)",
      }}
    >
      {/* Date */}
      <p
        style={{
          fontSize: "11px",
          color: "#777b86",
          fontWeight: 500,
          letterSpacing: "0.04em",
          margin: 0,
          textTransform: "uppercase",
        }}
      >
        {formatDate(label ?? "")}
      </p>

      {/* Total row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: "0.5px solid #f2f0ed",
          paddingBottom: "10px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#777b86" }}>
          {isCurrency ? "Total revenue" : "Total"}
        </span>
        <span style={{ fontSize: "20px", fontWeight: 600, color: "#17191c", lineHeight: 1 }}>
          {isCurrency ? formatCurrency(total) : total.toLocaleString("en-NG")}
        </span>
      </div>

      {/* Per-series rows with percentage bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {dataKeys.map((key, i) => {
          const val = payload[i]?.value ?? 0;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          const configEntry = chartConfig[key.datakey];
          const seriesLabel =
            typeof configEntry === "object" && "label" in configEntry
              ? String(configEntry.label)
              : key.datakey;

          return (
            <div key={key.datakey} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: key.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "12px", color: "#4c4c4c", flex: 1 }}>
                  {seriesLabel}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#17191c" }}>
                  {isCurrency ? formatCurrency(val) : val.toLocaleString("en-NG")}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#a3a6af",
                    minWidth: "34px",
                    textAlign: "right",
                  }}
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BarChartStacked({
  title,
  description,
  data,
  chartConfig,
  dataKeys,
  onFilterChange,
  selectedFilter,
  filterOptions = DEFAULT_FILTERS,
  isCurrency = true,
  emptyMessage = "No chart data available",
}: BarChartStackedProps) {
  return (
    <div className="border border-[#e8e6e3] flex flex-col">
      <div className="px-5 py-4 border-b border-[#e8e6e3] flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-[#17191c]">{title}</p>
          <p className="text-sm text-[#777b86] mt-0.5">{description}</p>
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="h-[34px] px-3 border border-[#e8e6e3] text-xs bg-white outline-none focus:border-[#17191c] transition-colors shrink-0"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border border-[#e8e6e3] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3a6af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="4" height="18" /><rect x="10" y="8" width="4" height="13" /><rect x="17" y="13" width="4" height="8" />
            </svg>
          </div>
          <p className="text-xs text-[#a3a6af]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="px-2 py-4">
          <ChartContainer config={chartConfig} className="w-full h-[280px] lg:h-[320px]">
            <BarChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="#f2f0ed" strokeDasharray="4" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fontSize: 11, fill: "#777b86", fontFamily: "'DM Sans', sans-serif" }}
                tickFormatter={(v) => formatDate(v)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={isCurrency ? 70 : 40}
                tick={{ fontSize: 11, fill: "#777b86", fontFamily: "'DM Sans', sans-serif" }}
                tickFormatter={(v: number) => isCurrency ? formatCurrency(v) : v.toLocaleString("en-NG")}
              />
              <ChartTooltip
                cursor={{ fill: "#f2f0ed" }}
                content={
                  <CustomTooltip
                    dataKeys={dataKeys}
                    chartConfig={chartConfig}
                    isCurrency={isCurrency}
                  />
                }
              />
              <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key.datakey}
                  dataKey={key.datakey}
                  stackId="a"
                  fill={key.color}
                  radius={
                    dataKeys.length === 1
                      ? [100, 100, 100, 100]
                      : index === 0
                      ? [0, 0, 100, 100]
                      : index === dataKeys.length - 1
                      ? [100, 100, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

export type { BarChartStackedProps, DataKey, FilterOption };