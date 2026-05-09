import {
  Label,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TrendingUp, TrendingDown } from "lucide-react";

interface RadialSegment {
  datakey: string;
  color: string;
  label: string;
}

interface RadialBarChartProps {
  title: string;
  description: string;
  data: Record<string, number>[];
  segments: RadialSegment[];
  centerLabel?: string;
  trend?: { value: string; positive: boolean; note: string };
  innerRadius?: number;
  outerRadius?: number;
  emptyMessage?: string;
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
  outerRadius = 110,
  emptyMessage = "No data to display",
}: RadialBarChartProps) {
  const chartConfig = buildChartConfig(segments);

  const total = data[0]
    ? segments.reduce((sum, s) => sum + (Number(data[0][s.datakey]) || 0), 0)
    : 0;

  const isEmpty = !data?.length || total === 0;

  return (
    <div className="border border-[#e8e6e3] flex flex-col">
      <div className="px-5 py-4 border-b border-[#e8e6e3]">
        <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">{title}</p>
        <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">{description}</p>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-xs text-[#a3a6af] font-selleasy_normal">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center px-5 py-4 gap-4">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-[220px]"
          >
            <RechartsRadialBarChart
              data={data}
              endAngle={180}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
            >
              {segments.map((s) => (
                <RadialBar
                  key={s.datakey}
                  dataKey={s.datakey}
                  stackId="a"
                  cornerRadius={0}
                  fill={s.color}
                  className="stroke-transparent stroke-2"
                />
              ))}
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) - 14}
                            style={{
                              fontSize: "22px",
                              fontWeight: 700,
                              fill: "#17191c",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {total.toLocaleString("en-NG")}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 6}
                            style={{
                              fontSize: "11px",
                              fill: "#777b86",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
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

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {segments.map((s) => (
              <div key={s.datakey} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-[#777b86] font-selleasy_normal">
                  {s.label}
                  {data[0] && (
                    <span className="text-[#17191c] font-semibold ml-1">
                      {Number(data[0][s.datakey] ?? 0).toLocaleString("en-NG")}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {trend && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#f2f0ed] w-full justify-center">
              {trend.positive
                ? <TrendingUp size={13} className="text-green-600" />
                : <TrendingDown size={13} className="text-red-500" />
              }
              <span className={`text-xs font-semibold font-dashboard_regular ${trend.positive ? "text-green-600" : "text-red-500"}`}>
                {trend.value}
              </span>
              <span className="text-xs text-[#777b86] font-selleasy_normal">{trend.note}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { RadialSegment, RadialBarChartProps };