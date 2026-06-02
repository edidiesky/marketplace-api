import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartSelect } from "./Chartselect";

type FilterOption = { label: string; value: string };

interface LineSeries {
  datakey: string;
  color: string;
  label: string;
}

interface LineChartMultipleProps {
  title: string;
  description: string;
  data: Array<{ date: string | number; [key: string]: string | number }>;
  chartConfig: ChartConfig;
  series: LineSeries[];
  onFilterChange: (value: string) => void;
  selectedFilter: string;
  filterOptions?: FilterOption[];
  isCurrency?: boolean;
  emptyMessage?: string;
  hideHeader?: boolean;
}

const DEFAULT_FILTERS: FilterOption[] = [
  { label: "7 Days", value: "7-days" },
  { label: "3 Weeks", value: "3-weeks" },
  { label: "3 Months", value: "3-months" },
];

function formatDate(value: string | number): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(1)}K`;
  return `₦${value}`;
}

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  name: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  series: LineSeries[];
  isCurrency: boolean;
}

function CustomTooltip({ active, payload, label, series, isCurrency }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid #e8e6e3",
        padding: "10px 14px",
        minWidth: "220px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
      }}
    >
      <p style={{ fontSize: "15px", color: "#17191c", margin: 0 }}>
        {formatDate(label ?? "")}
      </p>
      {payload.map((entry) => {
        const s = series.find((x) => x.datakey === entry.dataKey);
        return (
          <p key={entry.dataKey} style={{ fontSize: "15px", margin: 0 }}>
            <span style={{ color: s?.color, }}>{s?.label ?? entry.name}:</span>{" "}
            <span style={{ color: "#17191c" }}>
              {isCurrency ? formatCurrency(entry.value) : entry.value.toLocaleString("en-NG")}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function ChartLegendRow({ series }: { series: LineSeries[] }) {
  return (
    <div className="flex items-center justify-center gap-x-4 gap-y-2 flex-wrap pt-3 pb-1">
      {series.map((s) => (
        <div key={s.datakey} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
          <span className="text-sm text-[#4c4c4c]">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartLineMultiple({
  title,
  description,
  data,
  chartConfig,
  series,
  onFilterChange,
  selectedFilter,
  filterOptions = DEFAULT_FILTERS,
  isCurrency = false,
  emptyMessage = "No chart data available",
  hideHeader = false,
}: LineChartMultipleProps) {
  return (
    <div className="border border-[#e8e6e3] flex flex-col rounded-2xl">
      {!hideHeader && (
        <div className="px-5 py-4 border-b border-[#e8e6e3] flex items-start justify-between gap-4">
          <div>
            <p className="text-lg bold text-[#17191c]">{title}</p>
            <p className="text-sm text-[#777b86] mt-0.5">{description}</p>
          </div>
          <ChartSelect
            value={selectedFilter}
            onValueChange={onFilterChange}
            options={filterOptions}
          />
        </div>
      )}

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <img src="/assets/icons/card.png" className="w-50 h-50" alt="" />
          <p className="text-sm text-[#a3a6af]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="px-2 py-4">
          <ChartContainer config={chartConfig} className="w-full h-[280px] lg:h-[320px]">
            <LineChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="#f2f0ed" strokeDasharray="4" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fontSize: 14, fill: "#777b86" }}
                tickFormatter={(v) => formatDate(v)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={isCurrency ? 70 : 55}
                tick={{ fontSize: 14, fill: "#777b86" }}
                tickFormatter={(v: number) => isCurrency ? formatCurrency(v) : v.toLocaleString("en-NG")}
              />
              <ChartTooltip
                cursor={{ stroke: "#e8e6e3", strokeDasharray: "4" }}
                content={<CustomTooltip series={series} isCurrency={isCurrency} />}
              />
              {series.map((s) => (
                <Line
                  key={s.datakey}
                  dataKey={s.datakey}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
          <ChartLegendRow series={series} />
        </div>
      )}
    </div>
  );
}

export type { LineChartMultipleProps, LineSeries, FilterOption };