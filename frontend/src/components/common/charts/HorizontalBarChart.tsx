import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

interface HorizontalBarDataItem { label: string; [key: string]: string | number; }
interface HorizontalBarSeries  { datakey: string; color: string; seriesLabel: string; }

interface HorizontalBarChartProps {
  title: string;
  description: string;
  data: HorizontalBarDataItem[];
  series: HorizontalBarSeries[];
  yAxisWidth?: number;
  emptyMessage?: string;
  isCurrency?: boolean;
  headerRight?: React.ReactNode;
  hideHeader?: boolean;
}

function buildChartConfig(series: HorizontalBarSeries[]): ChartConfig {
  return Object.fromEntries(series.map((s) => [s.datakey, { label: s.seriesLabel, color: s.color }]));
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
    <div className="border border-[#e8e6e3] bg-white rounded-lg p-3 flex flex-col gap-1.5 min-w-[180px]">
      <p className="text-base text-[#17191c] truncate max-w-[180px]">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#777b86]">Total</span>
          <span className="text-base text-[#17191c]">{isCurrency ? `₦${total.toLocaleString("en-NG")}` : total.toLocaleString("en-NG")}</span>
        </div>
        {payload.map((entry) => {
          const s = series.find((x) => x.datakey === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s?.color }} />
                <span className="text-sm text-[#4c4c4c]">{s?.seriesLabel}</span>
              </div>
              <span className="text-lg text-[#17191c]">{isCurrency ? `₦${entry.value.toLocaleString("en-NG")}` : entry.value.toLocaleString("en-NG")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegendRow({ series }: { series: HorizontalBarSeries[] }) {
  return (
    <div className="flex items-center justify-center gap-x-4 gap-y-2 flex-wrap pt-3 pb-1">
      {series.map((s) => (
        <div key={s.datakey} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
          <span className="text-sm text-[#4c4c4c]">{s.seriesLabel}</span>
        </div>
      ))}
    </div>
  );
}

function ChartBody({ data, series, yAxisWidth, isCurrency, emptyMessage }: {
  data: HorizontalBarDataItem[];
  series: HorizontalBarSeries[];
  yAxisWidth: number;
  isCurrency: boolean;
  emptyMessage: string;
}) {
  const chartConfig = buildChartConfig(series);
  const chartHeight = Math.max(data.length * 48, 200);

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <img src="/assets/icons/card.png" className="w-50 h-50" alt="" />
        <p className="text-sm text-[#a3a6af]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 overflow-x-auto">
      <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4" horizontal={false} vertical stroke="#f2f0ed" />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: "#777b86" }}
              tickFormatter={(v: number) => isCurrency ? v >= 1_000_000 ? `₦${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `₦${(v/1_000).toFixed(0)}K` : `₦${v}` : v.toLocaleString("en-NG")}
            />
            <YAxis dataKey="label" type="category" width={yAxisWidth} tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: "#4c4c4c" }} tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}…` : v} />
            <ChartTooltip cursor={{ fill: "#f2f0ed" }} content={<CustomTooltip series={series} isCurrency={isCurrency} />} />
            {series.map((s, index) => (
              <Bar key={s.datakey} dataKey={s.datakey} stackId="stack" fill={s.color}
                radius={series.length === 1 ? [20,20,20,20] : index === 0 ? [20,0,0,20] : index === series.length - 1 ? [0,20,20,0] : [0,0,0,0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      <ChartLegendRow series={series} />
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
  headerRight,
  hideHeader = false,
}: HorizontalBarChartProps) {
  if (hideHeader) {
    return (
      <ChartBody data={data} series={series} yAxisWidth={yAxisWidth} isCurrency={isCurrency} emptyMessage={emptyMessage} />
    );
  }

  return (
    <div className="border w-full border-[#e8e6e3] flex flex-col rounded-2xl">
      <div className="px-5 py-4 border-b border-[#e8e6e3] flex items-start justify-between gap-4">
        <div>
          <p className="text-lg bold text-[#17191c]">{title}</p>
          <p className="text-sm text-[#777b86] mt-0.5">{description}</p>
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      <ChartBody data={data} series={series} yAxisWidth={yAxisWidth} isCurrency={isCurrency} emptyMessage={emptyMessage} />
    </div>
  );
}

export type { HorizontalBarDataItem, HorizontalBarSeries, HorizontalBarChartProps };