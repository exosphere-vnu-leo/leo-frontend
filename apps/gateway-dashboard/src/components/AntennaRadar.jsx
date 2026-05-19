export default function AntennaRadar({ azimuth = 212, elevation = 47, isTracking = true }) {
  // Chuyển đổi Azimuth sang góc xoay của kim quét (Radar thường bắt đầu từ 0 độ ở hướng Bắc)
  const rotation = azimuth;
  
  return (
    <div className="relative flex flex-col items-center justify-center p-2 bg-slate-900/50 rounded-xl border border-slate-800">
      <div className="relative h-40 w-40 rounded-full border border-slate-700 bg-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.1)] overflow-hidden">
        
        {/* Các vòng tròn đồng tâm (Grid) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-full rounded-full border border-slate-800/50" />
          <div className="absolute h-[75%] w-[75%] rounded-full border border-slate-800/50" />
          <div className="absolute h-[50%] w-[50%] rounded-full border border-slate-800/50" />
          <div className="absolute h-[25%] w-[25%] rounded-full border border-slate-800/50" />
        </div>

        {/* Trục tọa độ X-Y */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-[1px] bg-slate-800/50" />
          <div className="w-full h-[1px] bg-slate-800/50" />
        </div>

        {/* Hiệu ứng quét Radar (Sweeping Line) */}
        <div 
          className="absolute top-1/2 left-1/2 h-[50%] w-[50%] origin-top-left transition-all duration-1000 ease-linear"
          style={{ 
            transform: `rotate(${rotation - 90}deg)`,
            background: "linear-gradient(90deg, rgba(34,197,94,0.3) 0%, transparent 100%)",
            clipPath: "polygon(0 0, 100% 0, 100% 20%, 0 0)"
          }}
        />

        {/* Điểm đại diện cho vệ tinh (Target Dot) */}
        <div 
          className="absolute h-2 w-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80] transition-all duration-1000"
          style={{ 
            // Tính toán vị trí dựa trên Azimuth (góc) và Elevation (khoảng cách từ tâm)
            // Elevation càng cao (90 độ) thì càng gần tâm
            top: `${50 - (90 - elevation) * 0.4 * Math.sin((azimuth - 90) * Math.PI / 180)}%`,
            left: `${50 + (90 - elevation) * 0.4 * Math.cos((azimuth - 90) * Math.PI / 180)}%`,
          }}
        >
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
        </div>
      </div>

      {/* Thông số kỹ thuật hiển thị bên dưới Radar */}
      <div className="mt-3 w-full grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="flex justify-between border-b border-slate-800 pb-1">
          <span className="text-slate-500 uppercase">Azimuth:</span>
          <span className="text-white font-bold">{azimuth}°</span>
        </div>
        <div className="flex justify-between border-b border-slate-800 pb-1">
          <span className="text-slate-500 uppercase">Elev:</span>
          <span className="text-white font-bold">{elevation}°</span>
        </div>
        <div className="col-span-2 flex justify-between pt-1">
          <span className="text-slate-500 uppercase">Tracking Mode:</span>
          <span className={isTracking ? "text-green-400 font-bold" : "text-slate-400"}>
            {isTracking ? "AUTO" : "MANUAL"}
          </span>
        </div>
      </div>
    </div>
  );
}