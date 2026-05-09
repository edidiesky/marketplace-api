import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Info, Users } from "lucide-react";

interface RadialSegment {
  datakey: string;
  color: string;
  label: string;
  emptyColor?: string;
}

interface RadialBarChartProps {
  title?: string;
  description?: string;
  data: Record<string, number>[];
  segments: RadialSegment[];
  centerLabel?: string;
  centerSubLabel?: string;
  centerValue?: string;
  trend?: { value: string; positive: boolean; note: string };
  topLeft?: { label: string; highlight?: string; highlightColor?: string; sub?: string };
  topRight?: { label: string; value: string };
  emptyMessage?: string;
  hideHeader?: boolean;
  totalTicks?: number;
  tickWidth?: number;
  tickHeight?: number;
  gaugeRadius?: number;
}

interface GaugeCanvasProps {
  segments: RadialSegment[];
  data: Record<string, number>[];
  totalTicks?: number;
  tickWidth?: number;
  tickHeight?: number;
  gaugeRadius?: number;
}

function GaugeCanvas({
  segments,
  data,
  totalTicks = 27,
  tickWidth = 9,
  tickHeight = 36,
  gaugeRadius = 92,
}: GaugeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = 420, H = 210;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = "100%";
    canvas.style.maxWidth = `${W}px`;
    ctx.scale(DPR, DPR);

    const cx = W / 2;
    const cy = H - 22;
    const tickR = 4;

    const total = data[0]
      ? segments.reduce((sum, s) => sum + (Number(data[0][s.datakey]) || 0), 0)
      : 0;

    const segPcts = segments.map((s) =>
      total > 0 ? (Number(data[0]?.[s.datakey]) || 0) / total : 0
    );

    const getTickColor = (tickIndex: number): string => {
      const pct = tickIndex / (totalTicks - 1);
      let acc = 0;
      for (let si = 0; si < segments.length; si++) {
        acc += segPcts[si];
        if (pct <= acc + 0.001) return segments[si].color;
      }
      return segments[segments.length - 1]?.emptyColor ?? "#e0ddd8";
    };

    const badgeTickIndex = Math.round(segPcts[0] * (totalTicks - 1));

    // Draw each tick bar
    for (let i = 0; i < totalTicks; i++) {
      const pct = i / (totalTicks - 1);
      const angle = Math.PI + pct * Math.PI;
      const tx = cx + gaugeRadius * Math.cos(angle);
      const ty = cy + gaugeRadius * Math.sin(angle);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle + Math.PI / 2);

      const x = -tickWidth / 2;
      const y = -tickHeight / 2;

      ctx.beginPath();
      ctx.moveTo(x + tickR, y);
      ctx.lineTo(x + tickWidth - tickR, y);
      ctx.quadraticCurveTo(x + tickWidth, y, x + tickWidth, y + tickR);
      ctx.lineTo(x + tickWidth, y + tickHeight - tickR);
      ctx.quadraticCurveTo(x + tickWidth, y + tickHeight, x + tickWidth - tickR, y + tickHeight);
      ctx.lineTo(x + tickR, y + tickHeight);
      ctx.quadraticCurveTo(x, y + tickHeight, x, y + tickHeight - tickR);
      ctx.lineTo(x, y + tickR);
      ctx.quadraticCurveTo(x, y, x + tickR, y);
      ctx.closePath();

      ctx.fillStyle = getTickColor(i);
      ctx.fill();
      ctx.restore();
    }

    if (segments.length >= 2 && badgeTickIndex > 0) {
      const badgePct = badgeTickIndex / (totalTicks - 1);
      const badgeAngle = Math.PI + badgePct * Math.PI;
      const bx = cx + gaugeRadius * Math.cos(badgeAngle);
      const by = cy + gaugeRadius * Math.sin(badgeAngle);
      const bw = 48, bh = 22, br = 11;

      const displayPct = Math.round(segPcts[0] * 100);
      const badgeColor = segments[1].color;

      ctx.beginPath();
      ctx.moveTo(bx - bw / 2 + br, by - bh / 2);
      ctx.lineTo(bx + bw / 2 - br, by - bh / 2);
      ctx.quadraticCurveTo(bx + bw / 2, by - bh / 2, bx + bw / 2, by - bh / 2 + br);
      ctx.lineTo(bx + bw / 2, by + bh / 2 - br);
      ctx.quadraticCurveTo(bx + bw / 2, by + bh / 2, bx + bw / 2 - br, by + bh / 2);
      ctx.lineTo(bx - bw / 2 + br, by + bh / 2);
      ctx.quadraticCurveTo(bx - bw / 2, by + bh / 2, bx - bw / 2, by + bh / 2 - br);
      ctx.lineTo(bx - bw / 2, by - bh / 2 + br);
      ctx.quadraticCurveTo(bx - bw / 2, by - bh / 2, bx - bw / 2 + br, by - bh / 2);
      ctx.closePath();
      ctx.fillStyle = badgeColor;
      ctx.fill();

      // Badge text — use darkest stop of badge color family
      ctx.fillStyle = "#412402";
      ctx.font = `bold 11px 'DM Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${displayPct}%`, bx, by);
    }
  }, [segments, data, totalTicks, tickWidth, tickHeight, gaugeRadius]);

  return <canvas ref={canvasRef} />;
}

export function RadialBarChartCard({
  title,
  description,
  data,
  segments,
  centerLabel = "Total",
  centerSubLabel,
  centerValue,
  trend,
  topLeft,
  topRight,
  emptyMessage = "No data to display",
  hideHeader = false,
  totalTicks = 27,
  tickWidth = 9,
  tickHeight = 26,
  gaugeRadius = 92,
}: RadialBarChartProps) {
  const total = data[0]
    ? segments.reduce((sum, s) => sum + (Number(data[0][s.datakey]) || 0), 0)
    : 0;

  const isEmpty = !data?.length || total === 0;

  return (
    <div className={`flex flex-col ${!hideHeader ? "border":""}`}>
      {/* Optional header */}
      {!hideHeader && title && (
        <div className="px-5 py-4 border-b border-[#e8e6e3]">
          <p className="text-base font-semibold text-[#17191c] font-dashboard_regular">{title}</p>
          {description && (
            <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">{description}</p>
          )}
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-xs text-[#a3a6af] font-selleasy_normal">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col px-5 py-4 gap-2">

          {/* Top row */}
          {(topLeft || topRight) && (
            <div className="flex items-start justify-between mb-1">
              {topLeft && (
                <div>
                  <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">
                    {topLeft.label}{" "}
                    {topLeft.highlight && (
                      <span style={{ color: topLeft.highlightColor ?? segments[0]?.color }}>
                        {topLeft.highlight}
                      </span>
                    )}
                  </p>
                  {topLeft.sub && (
                    <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">{topLeft.sub}</p>
                  )}
                </div>
              )}
              {topRight && (
                <div className="text-right">
                  <p className="text-xs text-[#777b86] font-selleasy_normal flex items-center gap-1 justify-end">
                    <span className="inline-block border border-[#777b86] rounded-sm w-3 h-3 text-center leading-none text-[8px]">&#128274;</span>
                    {topRight.label}
                  </p>
                  <p className="text-base font-semibold text-[#17191c] font-dashboard_regular mt-0.5">
                    {topRight.value}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Gauge */}
          <div className="flex justify-center">
            <GaugeCanvas
              segments={segments}
              data={data}
              totalTicks={totalTicks}
              tickWidth={tickWidth}
              tickHeight={tickHeight}
              gaugeRadius={gaugeRadius}
            />
          </div>

          {/* Center info */}
          <div className="flex flex-col items-center gap-1 -mt-8">
            {centerSubLabel && (
              <p className="text-xs text-[#777b86] font-selleasy_normal flex items-center gap-1.5">
                <Users size={12} />
                {centerSubLabel}
              </p>
            )}
            <p className="text-2xl font-bold text-[#17191c] font-dashboard_regular tracking-tight">
              {centerValue ?? total.toLocaleString("en-NG")}
            </p>
            <p className="text-xs text-[#777b86] font-selleasy_normal flex items-center gap-1">
              <Info size={11} />
              {centerLabel}
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
            {segments.map((s) => (
              <div key={s.datakey} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm text-[#777b86] font-selleasy_normal">
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

          {/* Trend */}
          {trend && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#f2f0ed] w-full justify-center">
              {trend.positive ? (
                <TrendingUp size={13} className="text-green-600" />
              ) : (
                <TrendingDown size={13} className="text-red-500" />
              )}
              <span
                className={`text-xs font-semibold font-dashboard_regular ${
                  trend.positive ? "text-green-600" : "text-red-500"
                }`}
              >
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