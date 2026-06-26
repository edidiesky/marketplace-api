import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartSelect } from "./Chartselect";

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
  showBorder?: boolean;
  hideHeader?: boolean;
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

interface TooltipPayloadItem { value: number; dataKey: string; }
interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number | string;
  dataKeys: DataKey[];
  chartConfig: ChartConfig;
  isCurrency: boolean;
}

function CustomTooltip({ active, payload, label, dataKeys, chartConfig, isCurrency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p?.value ?? 0), 0);
  return (
    <div style={{ background: "white", border: "0.5px solid #e8e6e3", padding: "10px 14px", minWidth: "180px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)" }}>
      <p style={{ fontSize: "14px", color: "#17191c", margin: 0 }}>{formatDate(label ?? "")}</p>
      <p style={{ fontSize: "14px", color: "#4c4c4c", margin: 0 }}>
        {isCurrency ? "Total revenue" : "Total"}:{" "}
        <span style={{ color: "#17191c" }}>{isCurrency ? formatCurrency(total) : total.toLocaleString("en-NG")}</span>
      </p>
      {dataKeys.map((key, i) => {
        const val = payload[i]?.value ?? 0;
        const configEntry = chartConfig[key.datakey];
        const seriesLabel = typeof configEntry === "object" && "label" in configEntry ? String(configEntry.label) : key.datakey;
        return (
          <p key={key.datakey} style={{ fontSize: "14px", margin: 0 }}>
            <span style={{ color: key.color }}>{seriesLabel}:</span>{" "}
            <span style={{ color: "#17191c" }}>{isCurrency ? formatCurrency(val) : val.toLocaleString("en-NG")}</span>
          </p>
        );
      })}
    </div>
  );
}

function ChartLegendRow({ dataKeys, chartConfig }: { dataKeys: DataKey[]; chartConfig: ChartConfig }) {
  return (
    <div className="flex items-center justify-center gap-x-4 gap-y-2 flex-wrap pt-2 pb-1">
      {dataKeys.map((key) => {
        const configEntry = chartConfig[key.datakey];
        const label = typeof configEntry === "object" && "label" in configEntry ? String(configEntry.label) : key.datakey;
        return (
          <div key={key.datakey} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: key.color }} />
            <span className="text-sm text-[#4c4c4c]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartBody({ data, chartConfig, dataKeys, isCurrency, emptyMessage }: {
  data: BarChartStackedProps["data"];
  chartConfig: ChartConfig;
  dataKeys: DataKey[];
  isCurrency: boolean;
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <img src="/assets/icons/card.png" className="w-50 h-50" alt="" />
        <p className="text-sm text-[#a3a6af]">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="px-2 py-4">
      <ChartContainer config={chartConfig} className="w-full h-[280px] lg:h-[300px]">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="#f2f0ed" strokeDasharray="4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tick={{ fontSize: 13, fontWeight:600, fill: "#777b86" }} tickFormatter={(v) => formatDate(v)} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={isCurrency ? 70 : 55} tick={{ fontSize: 13, fontWeight:600, fill: "#777b86" }} tickFormatter={(v: number) => isCurrency ? formatCurrency(v) : v.toLocaleString("en-NG")} />
          <ChartTooltip cursor={{ fill: "#f2f0ed" }} content={<CustomTooltip dataKeys={dataKeys} chartConfig={chartConfig} isCurrency={isCurrency} />} />
          {dataKeys.map((key, index) => (
            <Bar key={key.datakey} dataKey={key.datakey} stackId="a" fill={key.color}
              radius={dataKeys.length === 1 ? [10,10,10,10] : index === 0 ? [0,0,10,10] : index === dataKeys.length - 1 ? [10,10,0,0] : [0,0,0,0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <ChartLegendRow dataKeys={dataKeys} chartConfig={chartConfig} />
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
  isCurrency = false,
  emptyMessage = "No chart data available",
  showBorder = true,
  hideHeader = false,
}: BarChartStackedProps) {
  // hideHeader: caller owns the border and header. Render body only.
  if (hideHeader) {
    return (
      <ChartBody data={data} chartConfig={chartConfig} dataKeys={dataKeys} isCurrency={isCurrency} emptyMessage={emptyMessage} />
    );
  }

  return (
    <div className={`${showBorder ? "border border-[#e8e6e3]" : ""} flex flex-col rounded-2xl`}>
      <div className="px-5 py-4 w-full border-b border-[#e8e6e3] flex items-start justify-between gap-4">
        <div className="w-full">
          <p className="text-lg font-bold text-[#17191c]">{title}</p>
          <p className="text-sm text-[#777b86] mt-0.5">{description}</p>
        </div>
        <ChartSelect value={selectedFilter} onValueChange={onFilterChange} options={filterOptions} />
      </div>
      <ChartBody data={data} chartConfig={chartConfig} dataKeys={dataKeys} isCurrency={isCurrency} emptyMessage={emptyMessage} />
    </div>
  );
}

export type { BarChartStackedProps, DataKey, FilterOption };