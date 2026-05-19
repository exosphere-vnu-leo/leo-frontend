import { useCallback, useEffect, useState } from "react";
import Card from "./Card";
import Icon from "./Icon";

// Handover reasons
const HANDOVER_REASONS = {
  LOW_ELEVATION: "Low elevation (< 30°)",
  SIGNAL_DEGRADED: "C/N degraded (< 12 dB)",
  PLANNED: "Planned orbital handover"
};

function Spark({ color = "#22c55e" }) {
  return (
    <svg viewBox="0 0 120 28" className="mt-2 h-7 w-full opacity-90">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points="0,18 12,16 22,17 33,11 43,15 55,13 66,7 77,14 88,9 100,13 112,8 120,10"
      />
    </svg>
  );
}

function SatelliteScene({ activeSat }) {
  // Tính toán góc xoay của tia tín hiệu dựa trên vệ tinh đang active
  // SAT-0119 (Trái: -35deg), SAT-0123 (Giữa: 0deg), SAT-0128 (Phải: 35deg)
  const beamRotation = activeSat === "SAT-0123" ? "0deg" : activeSat === "SAT-0119" ? "-35deg" : "35deg";

  return (
    <div className="relative h-[330px] overflow-hidden rounded-xl border border-slate-700/70 bg-[radial-gradient(circle_at_center,#0b2847_0%,#06101f_45%,#020617_100%)]">
      {/* 1. Lưới nền (Grid dots) */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      {/* 2. Vẽ đường vòm quỹ đạo (Orbit Line) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <path 
          d="M 50,180 Q 330,20 610,180" 
          fill="none" 
          stroke="#94a3b8" 
          strokeWidth="1.5" 
          strokeDasharray="6,6" 
        />
      </svg>

      {/* 3. Tia tín hiệu (Signal Beam) - Xoay theo activeSat */}
      <div 
        className="absolute bottom-[-10px] left-1/2 origin-bottom transition-all duration-1000 ease-in-out"
        style={{ 
          transform: `translateX(-50%) rotate(${beamRotation})`,
          width: '80px',
          height: '220px',
          background: 'linear-gradient(to top, rgba(34, 211, 238, 0.4) 0%, transparent 100%)',
          clipPath: 'polygon(45% 0, 55% 0, 100% 100%, 0 100%)',
          filter: 'blur(2px)'
        }}
      />

      {/* 4. Hiển thị các vệ tinh */}
      {["SAT-0119", "SAT-0123", "SAT-0128"].map((s, i) => {
        const isActive = s === activeSat;
        const positions = [
          { left: '80px', top: '130px', elev: '18°' },  // SAT-0119
          { left: '315px', top: '45px', elev: '47°' },  // SAT-0123
          { left: '540px', top: '130px', elev: '15°' }  // SAT-0128
        ];

        return (
          <div
            key={s}
            className="absolute text-center transition-all duration-700"
            style={{
              left: positions[i].left,
              top: positions[i].top,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="relative">
              <Icon
                name="satellite"
                size={isActive ? 48 : 38}
                className={`mx-auto mb-2 transition-all ${
                  isActive
                    ? "text-green-400 drop-shadow-[0_0_15px_#22c55e]"
                    : "text-slate-500 opacity-60"
                }`}
              />
              {isActive && (
                <div className="absolute inset-0 bg-green-400/20 blur-xl rounded-full animate-pulse" />
              )}
            </div>
            <b className={`block text-[11px] ${isActive ? "text-white" : "text-slate-400"}`}>{s}</b>
            <span className={`text-[10px] ${isActive ? "text-green-400 font-bold" : "text-slate-600"}`}>
              Elev: {positions[i].elev}
            </span>
          </div>
        );
      })}

      {/* 5. Chảo Anten mặt đất (Dish) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="w-16 h-8 bg-slate-800 rounded-[50%] border-t-2 border-slate-600 shadow-2xl relative">
          <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 w-1 h-4 bg-slate-500" />
        </div>
        <div className="text-[9px] font-bold text-green-500 animate-pulse mt-1 tracking-widest">
          TRACKING...
        </div>
      </div>
    </div>
  );
}

function GaugeCircle({ title = "LINK QUALITY", value = "78%", label = "GOOD" }) {
  const numericValue = parseInt(value) || 0;
  
  // Tính toán góc xoay của kim: 
  // 0% ứng với -90deg (bên trái), 100% ứng với 90deg (bên phải)
  const needleRotation = (numericValue / 100) * 180 - 90;

  return (
    <Card className="p-4 bg-slate-900/40 border-slate-800">
      <h3 className="mb-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest text-left">
        {title}
      </h3>
      
      <div className="relative mx-auto h-32 w-full flex items-center justify-center">
        {/* SVG Container: Giữ nguyên không xoay cả block để dễ kiểm soát tọa độ */}
        <svg className="w-48 h-24" viewBox="0 0 100 55">
          <defs>
            <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* 1. Lớp nền tối (Hình vòm nằm ngang) */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* 2. Lớp màu Gradient chạy theo giá trị */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#linkGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.6"
            /* 125.6 là nửa chu vi hình tròn bán kính 40 */
            strokeDashoffset={125.6 - (125.6 * numericValue) / 100}
            className="transition-all duration-1000 ease-out"
          />

          {/* 3. Các vạch chia (Ticks) */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * Math.PI + Math.PI; // Tính từ góc 180 độ (bên trái)
            const x1 = 50 + Math.cos(angle) * 32;
            const y1 = 50 + Math.sin(angle) * 32;
            const x2 = 50 + Math.cos(angle) * 40;
            const y2 = 50 + Math.sin(angle) * 40;
            return (
              <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="1" />
            );
          })}
        </svg>

        {/* 4. Kim đồng hồ: Đặt ở chính giữa đáy vòm */}
        <div 
          className="absolute bottom-[10px] w-1 h-16 bg-gradient-to-t from-green-500 to-transparent origin-bottom transition-transform duration-1000 ease-out"
          style={{ 
            transform: `rotate(${needleRotation}deg)`,
            left: 'calc(50% - 2px)' 
          }}
        >
          {/* Chốt kim */}
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#22c55e]" />
        </div>
      </div>

      {/* Chỉ số chữ */}
      <div className="mt-2 text-center">
        <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest leading-none">
          {label}
        </p>
        <p className="text-3xl font-black text-white mt-2 drop-shadow-sm">
          {value}
        </p>
      </div>
    </Card>
  );
}

export default function RouterDashboard({ activeSat, setActiveSat }) {
  const [latency, setLatency] = useState(42);
  const [download, setDownload] = useState(86.4);
  const [upload, setUpload] = useState(18.7);
  const [loss, setLoss] = useState(0.2);

  const [elevation, setElevation] = useState(47);
  const [cnRatio, setCnRatio] = useState(15.2);
  const [handoverLogs, setHandoverLogs] = useState([
    { time: "10:21:03", from: "SAT-0087", to: "SAT-0123", reason: "Low elevation", downtime: "120ms" }
  ]);

  const triggerHandover = useCallback(
    (reason) => {
      const nextSat = activeSat === "SAT-0123" ? "SAT-0128" : "SAT-0123";
      const timestamp = new Date().toLocaleTimeString();
      setActiveSat(nextSat);
      const newLog = {
        time: timestamp,
        from: activeSat,
        to: nextSat,
        reason: reason,
        downtime: `${Math.floor(Math.random() * 50 + 80)}ms`,
      };
      setHandoverLogs((prev) => [newLog, ...prev].slice(0, 5));
    },
    [activeSat, setActiveSat]
  );

  useEffect(() => {
    const tick = setInterval(() => {
      setElevation(prev => {
        const nextElev = prev - 0.5;
        if (nextElev < 30) {
          triggerHandover(HANDOVER_REASONS.LOW_ELEVATION);
          return 60;
        }
        return nextElev;
      });
      setCnRatio(() => (14 + Math.random() * 2).toFixed(1));

      setLatency((prev) => {
        const change = (Math.random() - 0.5) * 6;
        return Math.max(30, Math.min(60, Number(prev) + change)).toFixed(0);
      });
      setDownload((80 + Math.random() * 15).toFixed(1));
      setUpload((15 + Math.random() * 5).toFixed(1));
      setLoss((Math.random() * 0.5).toFixed(2));
    }, 1000);
    return () => clearInterval(tick);
  }, [activeSat, triggerHandover]);

  const quality = latency < 45 ? "GOOD" : latency < 55 ? "FAIR" : "BAD";
  const qualityColor = latency < 45 ? "#22c55e" : latency < 55 ? "#facc15" : "#ef4444";

  const metricCards = [
    ["LATENCY", latency, "ms", "#22c55e"],
    ["JITTER", "5", "ms", "#22c55e"],
    ["DOWNLOAD", download, "Mbps", "#16a34a"],
    ["UPLOAD", upload, "Mbps", "#0ea5e9"],
    ["PACKET LOSS", loss, "%", "#ef476f"],
    ["ERROR RATE", "0.0021", "", "#8b5cf6"],
    ["C/N", cnRatio, "dB-Hz", "#a3e635"],
    ["SNR", "13.1", "dB", "#7c3aed"],
    ["ELEVATION ANGLE", `${elevation.toFixed(1)}°`, "", elevation < 35 ? "#facc15" : "#f8fafc"],
    ["AZIMUTH", "212°", "", "#f8fafc"],
    ["PATH LOSS", "162.4", "dB", "#f8fafc"],
    ["LINK QUALITY", quality, "", qualityColor],
  ];

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center gap-3">
          <Icon name="satellite" className="text-blue-400" />
          {/* Chỉnh VNU-LEO sang màu trắng */}
          <b className="text-white tracking-wider">VNU-LEO</b>
          <span className="text-slate-300 font-medium">
            User Router Dashboard
          </span>
        </div>

        <div className="flex gap-4 text-sm text-slate-200">
          <span>Live</span>
          <span className="text-green-400 font-bold">● Online</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* LEFT */}
        <div className="col-span-2 space-y-3">
          <Card className="p-4 text-sm">
            {/* Chỉnh màu tiêu đề Connection */}
            <h3 className="font-bold text-slate-200 mb-2">CONNECTION</h3>

            <p className="my-4 font-bold text-green-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              ACTIVE LINK
            </p>

            {/* Chỉnh tên vệ tinh sang màu trắng */}
            <p className="text-2xl font-black text-white">{activeSat}</p>
            <div className="mt-2 flex flex-col">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-tighter">Elevation: </span>
              <span className={`text-3xl font-black ${elevation < 35 ? "text-yellow-500 animate-pulse" : "text-white"}`}>{elevation.toFixed(1)}°</span>
            </div>

            <p className="mt-4 text-slate-400 font-semibold uppercase text-[10px]">Uptime</p>
            <p className="text-white font-mono">00:32:47</p>
          </Card>

          <GaugeCircle
            value={Math.floor(download) % 100 + "%"}
            label={quality}
          />
        </div>

        {/* CENTER */}
        <div className="col-span-5 space-y-3">
          <SatelliteScene activeSat={activeSat} />

          <Card className="p-4">
            <h3 className="mb-2 text-xs font-bold text-slate-200 tracking-widest">
              SIGNAL PULSE
            </h3>
            <Spark color="#22c55e" />
            <Spark color="#0ea5e9" />
            <Spark color="#f59e0b" />
          </Card>
        </div>

        {/* RIGHT */}
        <div className="col-span-5">
          <Card className="grid grid-cols-4 gap-2 p-3">
            {metricCards.map(([t, v, u, c]) => (
              <div
                key={t}
                className="rounded-lg border border-slate-800 p-3 bg-slate-900/50"
              >
                <p className="text-[10px] text-slate-400 font-bold leading-tight mb-1">
                  {t}
                </p>
                <p
                  className="text-xl font-black"
                  style={{ color: c }}
                >
                  {v}<span className="text-[10px] ml-1 opacity-80">{u}</span>
                </p>
                <Spark color={c} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* HANDOVER LOG TABLE */}
      <div className="grid grid-cols-12 gap-4 mt-3">
        <Card className="col-span-12 p-4 bg-slate-900/40 border-slate-800 shadow-inner">
          <h3 className="text-[10px] font-bold text-slate-200 uppercase mb-3 tracking-widest">Handover History</h3>
          <table className="w-full text-left text-[11px] font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="pb-2 font-semibold">TIME</th>
                <th className="pb-2 font-semibold">FROM → TO</th>
                <th className="pb-2 font-semibold">REASON</th>
                <th className="pb-2 text-right font-semibold">DOWNTIME</th>
              </tr>
            </thead>
            <tbody>
              {handoverLogs.map((log, i) => (
                <tr key={i} className="border-b border-slate-800/30 hover:bg-white/5 transition-colors">
                  <td className="py-2 text-slate-300">{log.time}</td>
                  {/* Chỉnh text SAT-ID sang màu trắng */}
                  <td className="py-2 text-white font-bold">{log.from} → <span className="text-green-400">{log.to}</span></td>
                  <td className="py-2 text-yellow-500/90 italic">{log.reason}</td>
                  <td className="py-2 text-right text-cyan-400 font-bold">{log.downtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}