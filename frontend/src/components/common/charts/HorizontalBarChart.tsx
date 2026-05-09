import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";

interface HorizontalBarDataItem {
  label: string;
  [key: string]: string | number;
}

interface HorizontalBarSeries {
  datakey: string;
  color: string;
  seriesLabel: string;
}

interface HorizontalBarChartProps {
  title: string;
  description: string;
  data: HorizontalBarDataItem[];
  series: HorizontalBarSeries[];
  yAxisWidth?: number;
  emptyMessage?: string;
  isCurrency?: boolean;
}

function buildChartConfig(series: HorizontalBarSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((s) => [s.datakey, { label: s.seriesLabel, color: s.color }])
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; dataKey: string; payload: HorizontalBarDataItem }[];
  series: HorizontalBarSeries[];
  isCurrency: boolean;
}

function CustomTooltip({ active, payload, series, isCurrency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const label = payload[0]?.payload?.label;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    <div className="border border-[#e8e6e3] bg-white p-3 shadow-sm flex flex-col gap-1.5 min-w-[180px]">
      <p className="text-base font-semibold text-[#17191c] font-dashboard_regular truncate max-w-[180px]">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-base text-[#777b86] font-normal">Total</span>
          <span className="text-sm font-semibold text-[#17191c] font-dashboard_regular">
            {isCurrency ? `₦${total.toLocaleString("en-NG")}` : total.toLocaleString("en-NG")}
          </span>
        </div>
        {payload.map((entry) => {
          const s = series.find((x) => x.datakey === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s?.color }} />
                <span className="text-xs text-[#4c4c4c] font-normal">{s?.seriesLabel}</span>
              </div>
              <span className="text-xs font-semibold text-[#17191c] font-dashboard_regular">
                {isCurrency ? `₦${entry.value.toLocaleString("en-NG")}` : entry.value.toLocaleString("en-NG")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HorizontalBarChart({
  title,
  description,
  data,
  series,
  yAxisWidth = 120,
  emptyMessage = "No data available",
  isCurrency = false,
}: HorizontalBarChartProps) {
  const chartConfig = buildChartConfig(series);
  const chartHeight = Math.max(data.length * 48, 200);

  return (
    <div className="border border-[#e8e6e3] flex flex-col">
      <div className="px-5 py-4 border-b border-[#e8e6e3]">
        <p className="text-base font-semibold text-[#17191c] font-dashboard_regular">{title}</p>
        <p className="text-sm text-[#777b86] font-normal mt-0.5">{description}</p>
      </div>

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-xs text-[#a3a6af] font-normal">{emptyMessage}</p>
        </div>
      ) : (
        <div className="px-4 py-4 overflow-x-auto">
          <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="4"
                  horizontal={false}
                  vertical
                  stroke="#f2f0ed"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#777b86", fontFamily: "'DM Sans', sans-serif" }}
                  tickFormatter={(v: number) =>
                    isCurrency
                      ? v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `₦${(v / 1_000).toFixed(0)}K` : `₦${v}`
                      : v.toLocaleString("en-NG")
                  }
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={yAxisWidth}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#4c4c4c", fontFamily: "'DM Sans', sans-serif" }}
                  tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}…` : v}
                />
                <ChartTooltip
                  cursor={{ fill: "#f2f0ed" }}
                  content={
                    <CustomTooltip series={series} isCurrency={isCurrency} />
                  }
                />
                <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} />
                {series.map((s, index) => (
                  <Bar
                    key={s.datakey}
                    dataKey={s.datakey}
                    stackId="stack"
                    fill={s.color}
                    radius={
                      series.length === 1
                        ? [0, 0, 0, 0]
                        : index === series.length - 1
                        ? [0, 0, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

export type { HorizontalBarDataItem, HorizontalBarSeries, HorizontalBarChartProps };