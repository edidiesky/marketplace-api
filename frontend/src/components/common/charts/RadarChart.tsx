// RadarChartCard.tsx
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

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

function ChartLegendRow({ series }: { series: RadarSeries[] }) {
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
        <p className="text-lg bold text-[#17191c]">{title}</p>
        <p className="text-sm text-[#777b86] mt-0.5">{description}</p>
      </div>

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <img src="/assets/icons/card.png" className="w-50 h-50" alt="" />
          <p className="text-xs text-[#a3a6af]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="px-4 py-4">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[280px]"
          >
            <RechartsRadarChart
              data={data}
              margin={{ top: -40, bottom: -10, left: 0, right: 0 }}
            >
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <PolarGrid stroke="#e8e6e3" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#777b86" }}
              />
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
          </ChartContainer>
          <ChartLegendRow series={series} />
        </div>
      )}
    </div>
  );
}

export type { RadarDataItem, RadarSeries, RadarChartProps };