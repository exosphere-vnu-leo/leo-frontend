import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTick(value) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue.toFixed(1);
  }
  return String(value ?? "");
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
              {entry.name || entry.dataKey}
            </span>
            <span className="font-mono text-slate-50">
              {Number.isFinite(entry.value) ? Number(entry.value).toFixed(2) : String(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RealTimeAreaChart({
  data,
  color = "#22c55e",
  dataKey = "val",
  series,
  xDataKey = "time",
  windowSize = 30,
}) {
  const chartData = Array.isArray(data) ? data.slice(-windowSize) : [];
  const hasSeries = Array.isArray(series) && series.length > 0;

  return (
    <div className="h-24 w-full mt-1 md:h-28">
      <ResponsiveContainer width="100%" height="100%">
        {hasSeries ? (
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              {series.map((item) => (
                <linearGradient key={item.key} id={`colorGrad-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={item.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.45} />
            <XAxis dataKey={xDataKey} tickFormatter={formatTick} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={38} tickFormatter={formatTick} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#cbd5e1" }} iconType="circle" />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorGrad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.45} />
            <XAxis dataKey={xDataKey} tickFormatter={formatTick} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={38} tickFormatter={formatTick} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#colorGrad-${dataKey})`}
              isAnimationActive
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}