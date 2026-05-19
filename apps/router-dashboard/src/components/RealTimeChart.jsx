import React from 'react';
import { AreaChart, Area, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function RealTimeAreaChart({ data, color = "#22c55e", dataKey = "val" }) {
  return (
    <div className="h-16 w-full mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`colorGrad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
          <Area
            type="monotone" // Giúp đường kẻ uốn lượn mượt mà
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#colorGrad-${dataKey})`}
            isAnimationActive={false} // Tắt animation để dữ liệu nhảy mượt hơn
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}