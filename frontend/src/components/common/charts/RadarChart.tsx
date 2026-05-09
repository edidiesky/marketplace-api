import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

interface RadarDataItem {
  label: string;
  [key: string]: string | number;
}

interface RadarSeries {
  datakey: string;
  color: string;
  label: string;
  fillOpacity?: number;
}

interface RadarChartProps {
  title: string;
  description: string;
  data: RadarDataItem[];
  series: RadarSeries[];
  emptyMessage?: string;
}

function buildChartConfig(series: RadarSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((s) => [s.datakey, { label: s.label, color: s.color }])
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; payload: RadarDataItem }[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const label = payload[0]?.payload?.label;
  return (
    <div className="border border-[#e8e6e3] bg-white p-3 shadow-sm flex flex-col gap-1.5 min-w-[140px]">
      <p className="text-base text-[#17191c] font-semibold">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: entry.payload ? "#5d2a1a" : "#fbe1d1" }} />
          <span className="text-sm text-[#4c4c4c] font-noral">
            {entry.name}:{" "}
            <span className="font-semibold text-[#17191c]">
              {Number(entry.value).toLocaleString("en-NG")}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function RadarChartCard({
  title,
  description,
  data,
  series,
  emptyMessage = "No data to display",
}: RadarChartProps) {
  const chartConfig = buildChartConfig(series);

  return (
    <div className="border border-[#e8e6e3] flex flex-col">
      <div className="px-5 py-4 border-b border-[#e8e6e3]">
        <p className="text-lg font-semibold text-[#17191c]">{title}</p>
        <p className="text-sm text-[#777b86] font-noral mt-0.5">{description}</p>
      </div>

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-[#a3a6af] font-noral">{emptyMessage}</p>
        </div>
      ) : (
        <div className="px-4 py-4">
          <ChartContainer config={chartConfig} className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsRadarChart data={data}>
                <PolarGrid stroke="#e8e6e3" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#777b86", fontFamily: "'DM Sans', sans-serif" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, "auto"]}
                  tick={{ fontSize: 10, fill: "#a3a6af", fontFamily: "'DM Sans', sans-serif" }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<CustomTooltip />} />
                {series.map((s) => (
                  <Radar
                    key={s.datakey}
                    name={s.label}
                    dataKey={s.datakey}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={s.fillOpacity ?? 0.25}
                    dot={{ r: 3, fill: s.color }}
                  />
                ))}
              </RechartsRadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

export type { RadarDataItem, RadarSeries, RadarChartProps };