import {
  Label,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { TrendingUp, TrendingDown } from "lucide-react";

interface RadialSegment {
  datakey: string;
  color: string;
  label: string;
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString("en-NG")}`;
}

function fmtCount(n: number): string {
  return n.toLocaleString("en-NG");
}

interface RadialBarChartProps {
  title: string;
  description: string;
  data: Record<string, number>[];
  segments: RadialSegment[];
  centerLabel?: string;
  centerValue?: string;
  trend?: { value: string; positive: boolean; note: string };
  innerRadius?: number;
  outerRadius?: number;
  emptyMessage?: string;
  isCurrency?: boolean;
  hideHeader?: boolean;
}

interface RadialTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string; payload: Record<string, number> }[];
  segments: RadialSegment[];
  isCurrency: boolean;
}

function CustomRadialTooltip({ active, payload, segments, isCurrency }: RadialTooltipProps) {
  if (!active || !payload?.length) return null;

  const fmt = isCurrency ? fmtAmount : fmtCount;
  const dataPoint = payload[0]?.payload ?? {};
  const total = segments.reduce((sum, s) => sum + (Number(dataPoint[s.datakey]) || 0), 0);

  return (
    <div style={{
      background: "white",
      border: "0.5px solid #e8e6e3",
      padding: "10px 14px",
      maxWidth: "290px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "0.5px solid #f2f0ed", paddingBottom: "8px" }}>
        <span style={{ fontSize: "14px", color: "#777b86" }}>Total</span>
        <span style={{ fontSize: "15px", color: "#17191c" }}>{fmt(total)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {segments.map((s) => {
          const val = Number(dataPoint[s.datakey]) || 0;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          return (
            <div key={s.datakey} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: "14px", color: "#4c4c4c", flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: "14px", color: "#17191c" }}>{fmt(val)}</span>
              <span style={{ fontSize: "13px", color: "#a3a6af", minWidth: "32px", textAlign: "right" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildChartConfig(segments: RadialSegment[]): ChartConfig {
  return Object.fromEntries(
    segments.map((s) => [s.datakey, { label: s.label, color: s.color }])
  );
}

export function RadialBarChartCard({
  title,
  description,
  data,
  segments,
  centerLabel = "Total",
  trend,
  innerRadius = 70,
  outerRadius = 100,
  emptyMessage = "No data to display",
  isCurrency = true,
  hideHeader = false,
}: RadialBarChartProps) {
  const chartConfig = buildChartConfig(segments);

  const total = data[0]
    ? segments.reduce((sum, s) => sum + (Number(data[0][s.datakey]) || 0), 0)
    : 0;

  const isEmpty = !data?.length || total === 0;

  // When hideHeader is true the caller owns the outer border and header.
  // Render only the chart body with no wrapping border or title block.
  if (hideHeader) {
    return (
      <div className="flex flex-col">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <img src="/assets/icons/card.png" className="w-50 h-50" alt="" />
            <p className="text-sm text-[#a3a6af]">{emptyMessage}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-4 gap-4">
            <ChartContainer
            config={chartConfig}
            className="mx-auto w-full"
            style={{ height: "180px" }}
          >
            <RechartsRadialBarChart
              data={data}
              endAngle={180}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              cx="50%"
              cy="80%"
            >
              {segments.map((s) => (
                <RadialBar
                  key={s.datakey}
                  dataKey={s.datakey}
                  stackId="a"
                  cornerRadius={100}
                  fill={s.color}
                  className="stroke-transparent stroke-2"
                />
              ))}
              <ChartTooltip
                cursor={false}
                content={<CustomRadialTooltip segments={segments} isCurrency={isCurrency} />}
              />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) - 14}
                            style={{ fontSize: "22px", fill: "#17191c" }}
                          >
                            {total.toLocaleString("en-NG")}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 6}
                            style={{ fontSize: "14px", fill: "#777b86" }}
                          >
                            {centerLabel}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
            </RechartsRadialBarChart>
          </ChartContainer>

          <div className="flex items-center justify-center gap-x-4 gap-y-2 flex-wrap">
            {segments.map((s) => {
              const val = Number(data[0]?.[s.datakey] ?? 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
              return (
                <div key={s.datakey} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm text-[#4c4c4c]">
                    {s.label}{" "}
                    <span className="text-[#777b86]">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>

          {trend && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#f2f0ed] w-full justify-center">
              {trend.positive
                ? <TrendingUp size={13} className="text-green-600" />
                : <TrendingDown size={13} className="text-red-500" />
              }
              <span className={`text-xs bold ${trend.positive ? "text-green-600" : "text-red-500"}`}>
                {trend.value}
              </span>
              <span className="text-xs text-[#777b86]">{trend.note}</span>
            </div>
          )}
        </div>
      )}
      </div>
    );
  }

  return (
    <div className="border border-[#e8e6e3] flex flex-col rounded-2xl">
      <div className="px-5 py-4 border-b border-[#e8e6e3]">
        <h3 className="text-lg bold text-[#17191c]">{title}</h3>
        <p className="text-sm text-[#777b86] mt-0.5">{description}</p>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <img src="/assets/icons/card.png" className="w-50 h-50" alt="" />
          <p className="text-sm text-[#a3a6af]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center px-5 py-4 gap-4">
          <ChartContainer
            config={chartConfig}
            className="mx-auto w-full"
            style={{ height: "140px" }}
          >
            <RechartsRadialBarChart
              data={data}
              endAngle={180}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              cx="50%"
              cy="80%"
            >
              {segments.map((s) => (
                <RadialBar
                  key={s.datakey}
                  dataKey={s.datakey}
                  stackId="a"
                  cornerRadius={100}
                  fill={s.color}
                  className="stroke-transparent stroke-2"
                />
              ))}
              <ChartTooltip
                cursor={false}
                content={<CustomRadialTooltip segments={segments} isCurrency={isCurrency} />}
              />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 14} style={{ fontSize: "22px", fill: "#17191c" }}>
                            {total.toLocaleString("en-NG")}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 6} style={{ fontSize: "14px", fill: "#777b86" }}>
                            {centerLabel}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
            </RechartsRadialBarChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-x-4 gap-y-2 flex-wrap">
            {segments.map((s) => {
              const val = Number(data[0]?.[s.datakey] ?? 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
              return (
                <div key={s.datakey} className="flex bold items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm bold text-[#4c4c4c]">
                    {s.label}{" "}<span className="text-[#777b86]">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
          {trend && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#f2f0ed] w-full justify-center">
              {trend.positive
                ? <TrendingUp size={13} className="text-green-600" />
                : <TrendingDown size={13} className="text-red-500" />
              }
              <span className={`text-xs bold ${trend.positive ? "text-green-600" : "text-red-500"}`}>
                {trend.value}
              </span>
              <span className="text-xs text-[#777b86]">{trend.note}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { RadialSegment, RadialBarChartProps };