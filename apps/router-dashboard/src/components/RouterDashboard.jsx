import { useState, useEffect, useRef } from "react";
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

const SCENE_WIDTH = 720;
const SCENE_HEIGHT = 330;
const HORIZON_Y = 250;
const ROUTER_POINT = { x: 360, y: 252 };

const SATELLITE_SCENE_POINTS = {
  "SAT-0119": { x: 156, y: 132, elev: 18 },
  "SAT-0123": { x: 360, y: 78, elev: 47 },
  "SAT-0128": { x: 564, y: 136, elev: 15 },
};

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function linePoint(start, end, distance) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY) || 1;

  return {
    x: start.x + (deltaX / length) * distance,
    y: start.y + (deltaY / length) * distance,
  };
}

function pointOnCircle(center, radius, angleDegrees) {
  const angleRadians = (angleDegrees * Math.PI) / 180;

  return {
    x: center.x + Math.cos(angleRadians) * radius,
    y: center.y + Math.sin(angleRadians) * radius,
  };
}

function SatelliteScene({ activeSat, elevationAngle = 0 }) {
  const activePoint = SATELLITE_SCENE_POINTS[activeSat] || SATELLITE_SCENE_POINTS["SAT-0123"];
  const visualElevation = clampNumber(Number(elevationAngle) || activePoint.elev, 12, 68);
  const activeSatellite = {
    ...activePoint,
    y: Math.max(74, HORIZON_Y - visualElevation * 3.05),
  };

  const satellites = Object.entries(SATELLITE_SCENE_POINTS).map(([name, point]) => ({
    name,
    x: point.x,
    y: name === activeSat ? activeSatellite.y : point.y,
    elev: name === activeSat ? `${visualElevation.toFixed(1)}°` : `${point.elev}°`,
    isActive: name === activeSat,
  }));

  const beamSide = activeSatellite.x >= ROUTER_POINT.x ? 1 : -1;
  const arcRadius = 34;
  const horizonAngle = beamSide > 0 ? 0 : 180;
  const arcSweep = beamSide > 0 ? 0 : 1;
  const arcStart = pointOnCircle(ROUTER_POINT, arcRadius, horizonAngle);
  const arcEnd = pointOnCircle(ROUTER_POINT, arcRadius, beamSide > 0 ? -visualElevation : 180 + visualElevation);
  const arcMid = pointOnCircle(ROUTER_POINT, arcRadius + 12, beamSide > 0 ? -visualElevation / 2 : 180 + visualElevation / 2);
  const arcLabel = pointOnCircle(ROUTER_POINT, arcRadius + 19, beamSide > 0 ? -Math.max(12, visualElevation / 2) : 180 + Math.max(12, visualElevation / 2));

  const beamPath = `M ${ROUTER_POINT.x} ${ROUTER_POINT.y} L ${activeSatellite.x} ${activeSatellite.y}`;
  const beamGhostPath = `M ${ROUTER_POINT.x} ${ROUTER_POINT.y} L ${activeSatellite.x} ${Math.max(88, activeSatellite.y + 10)}`;
  const arcPathId = `elevation-arc-${activeSat}`;
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcRadius} ${arcRadius} 0 0 ${arcSweep} ${arcEnd.x} ${arcEnd.y}`;
  const beamAngleLabel = `${visualElevation.toFixed(1)}°`;

  return (
    <div className="relative h-[330px] overflow-hidden rounded-xl border border-slate-700/70 bg-[radial-gradient(circle_at_center,#0b2847_0%,#06101f_45%,#020617_100%)]">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full pointer-events-none"
      >
        <defs>
          <linearGradient id="sceneSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#123a61" stopOpacity="0.85" />
            <stop offset="56%" stopColor="#071624" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#030712" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="earthGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f3b63" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#030712" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="beamGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.05" />
            <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="arcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.95" />
          </linearGradient>
          <filter id="beamGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="routerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#sceneSky)" />

        <path
          d={`M 0 ${HORIZON_Y} Q ${SCENE_WIDTH / 2} ${HORIZON_Y - 28} ${SCENE_WIDTH} ${HORIZON_Y} L ${SCENE_WIDTH} ${SCENE_HEIGHT} L 0 ${SCENE_HEIGHT} Z`}
          fill="url(#earthGlow)"
        />
        <path
          d={`M 0 ${HORIZON_Y} Q ${SCENE_WIDTH / 2} ${HORIZON_Y - 28} ${SCENE_WIDTH} ${HORIZON_Y}`}
          fill="none"
          stroke="#cbd5e1"
          strokeOpacity="0.72"
          strokeWidth="1.8"
        />
        <path
          d={`M ${ROUTER_POINT.x - 108} ${HORIZON_Y} Q ${ROUTER_POINT.x - 28} ${HORIZON_Y - 10} ${ROUTER_POINT.x + 78} ${HORIZON_Y}`}
          fill="none"
          stroke="#a5f3fc"
          strokeOpacity="0.34"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d={`M 0 ${HORIZON_Y + 3} Q ${SCENE_WIDTH / 2} ${HORIZON_Y - 18} ${SCENE_WIDTH} ${HORIZON_Y + 3}`}
          fill="none"
          stroke="#22d3ee"
          strokeOpacity="0.15"
          strokeWidth="2"
          strokeDasharray="10 16"
        />

        {Object.values(SATELLITE_SCENE_POINTS).map((point) => {
          const ghostEnd = linePoint(ROUTER_POINT, point === activePoint ? activeSatellite : point, 82);

          return (
            <g key={`${point.x}-${point.y}`} opacity={point === activePoint ? 0.14 : 0.1} filter="url(#beamGlow)">
              <path
                d={`M ${ROUTER_POINT.x} ${ROUTER_POINT.y} L ${ghostEnd.x} ${ghostEnd.y}`}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="7 12"
              />
            </g>
          );
        })}

        <g filter="url(#beamGlow)">
          <path
            d={beamPath}
            fill="none"
            stroke="url(#beamGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "beamPulse 3.5s ease-in-out infinite" }}
          />
          <path
            d={beamGhostPath}
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.25"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "pulse 3.2s ease-in-out infinite" }}
          />
        </g>

        <path
          id={arcPathId}
          d={arcPath}
          fill="none"
          stroke="url(#arcGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="6 8"
          filter="url(#softGlow)"
        />
        <text
          x={arcLabel.x}
          y={arcLabel.y}
          fill="#ecfeff"
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.03em"
          paintOrder="stroke"
          stroke="#020617"
          strokeWidth="4.5"
        >
          {beamAngleLabel}
        </text>
        <circle
          cx={ROUTER_POINT.x}
          cy={ROUTER_POINT.y}
          r="28"
          fill="url(#routerGlow)"
          filter="url(#softGlow)"
          opacity="0.75"
        />
        <circle cx={ROUTER_POINT.x} cy={ROUTER_POINT.y} r="3.5" fill="#d1fae5" />
      </svg>

      <div
        className="absolute left-0 top-0 h-full w-full pointer-events-none"
        style={{ animation: "pulse 4s ease-in-out infinite" }}
      >
        {satellites.map((sat) => (
          <div
            key={sat.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700"
            style={{
              left: `${(sat.x / SCENE_WIDTH) * 100}%`,
              top: `${(sat.y / SCENE_HEIGHT) * 100}%`,
            }}
          >
            <div className="relative mx-auto w-fit">
              <div
                className={`absolute inset-[-14px] rounded-full transition-opacity duration-700 ${
                  sat.isActive ? "bg-cyan-400/20 opacity-100 blur-xl" : "bg-cyan-400/10 opacity-50 blur-2xl"
                }`}
              />
              <Icon
                name="satellite"
                size={sat.isActive ? 50 : 36}
                className={`relative mx-auto transition-all duration-700 ${
                  sat.isActive
                    ? "text-cyan-300 drop-shadow-[0_0_18px_#22d3ee]"
                    : "text-slate-500 opacity-70"
                }`}
              />
            </div>
            <b className={`mt-1 block text-[11px] tracking-wide ${sat.isActive ? "text-white" : "text-slate-400"}`}>
              {sat.name}
            </b>
            <span className={`text-[10px] ${sat.isActive ? "text-cyan-300 font-bold" : "text-slate-500"}`}>
              Elev: {sat.elev}
            </span>
          </div>
        ))}

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: `${(ROUTER_POINT.x / SCENE_WIDTH) * 100}%`, top: `${(ROUTER_POINT.y / SCENE_HEIGHT) * 100}%` }}
        >
          <div className="relative">
            <div className="absolute inset-[-12px] rounded-full bg-emerald-400/20 blur-xl" />
            <Icon name="router" size={40} className="relative text-emerald-300 drop-shadow-[0_0_16px_#22c55e]" />
          </div>
          <div className="mt-2 h-3 w-14 rounded-[50%] border border-slate-500/70 bg-slate-800/90 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]" />
          <div className="mt-1 text-[9px] font-bold tracking-[0.35em] text-emerald-400">ROUTER</div>
        </div>

        <div
          className="absolute text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-300/90"
          style={{ left: `${((ROUTER_POINT.x - 86) / SCENE_WIDTH) * 100}%`, top: `${((HORIZON_Y + 14) / SCENE_HEIGHT) * 100}%` }}
        >
          HORIZON
        </div>

        <div
          className="absolute left-1/2 top-[78%] -translate-x-1/2 text-[9px] font-bold text-emerald-400 animate-pulse tracking-widest"
        >
          TRACKING...
        </div>
      </div>

      <style>{`@keyframes beamPulse { 0%, 100% { opacity: 0.82; } 50% { opacity: 1; } }`}</style>
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
  const [selectedUtId, setSelectedUtId] = useState("UT-1");
  const [latency, setLatency] = useState(42);
  const [download, setDownload] = useState(86.4);
  const [upload, setUpload] = useState(18.7);
  const [loss, setLoss] = useState(0.2);

  const [elevation, setElevation] = useState(47);
  const [cnRatio, setCnRatio] = useState(15.2);
  const elevationRef = useRef(elevation);
  const [handoverLogs, setHandoverLogs] = useState([
    { time: "10:21:03", from: "SAT-0087", to: "SAT-0123", reason: "Low elevation", downtime: "120ms" }
  ]);

  useEffect(() => {
    elevationRef.current = elevation;
  }, [elevation]);

  useEffect(() => {
    const tick = setInterval(() => {
      const nextElevation = elevationRef.current - 0.5;
      if (nextElevation < 30) {
        triggerHandover(HANDOVER_REASONS.LOW_ELEVATION);
        setElevation(60);
      } else {
        setElevation(nextElevation);
      }
      setCnRatio(14 + Math.random() * 2);

      setLatency((prev) => {
        const change = (Math.random() - 0.5) * 6;
        return Math.round(Math.max(30, Math.min(60, Number(prev) + change)));
      });
      setDownload(80 + Math.random() * 15);
      setUpload(15 + Math.random() * 5);
      setLoss(Number((Math.random() * 0.5).toFixed(2)));
    }, 1000);
    return () => clearInterval(tick);
  }, [activeSat]);

  const triggerHandover = (reason) => {
    const nextSat = activeSat === "SAT-0123" ? "SAT-0128" : "SAT-0123";
    const timestamp = new Date().toLocaleTimeString();
    setActiveSat(nextSat);
    const newLog = {
      time: timestamp,
      from: activeSat,
      to: nextSat,
      reason: reason,
      downtime: `${Math.floor(Math.random() * 50 + 80)}ms`
    };
    setHandoverLogs(prev => [newLog, ...prev].slice(0, 5));
  };

  const quality = latency < 45 ? "GOOD" : latency < 55 ? "FAIR" : "BAD";
  const qualityColor = latency < 45 ? "#22c55e" : latency < 55 ? "#facc15" : "#ef4444";
  const safeLatency = Number(latency) || 0;
  const safeDownload = Number(download) || 0;
  const safeUpload = Number(upload) || 0;
  const safeLoss = Number(loss) || 0;
  const safeElevation = Number(elevation) || 0;
  const safeCnRatio = Number(cnRatio) || 0;
  const formattedLatency = `${Math.round(safeLatency)} ms`;
  const formattedJitter = `${Math.round(5)} ms`;
  const formattedDownload = `${safeDownload.toFixed(1)} Mbps`;
  const formattedUpload = `${safeUpload.toFixed(1)} Mbps`;
  const formattedLoss = `${safeLoss.toFixed(2)}%`;
  const formattedCn = `${safeCnRatio.toFixed(1)} dB-Hz`;
  const formattedSnr = `13.1 dB`;
  const formattedElevation = `${safeElevation.toFixed(1)}°`;
  const formattedAzimuth = `212.0°`;
  const formattedPathLoss = `162.4 dB`;

  const metricCards = [
    ["LATENCY", formattedLatency, "", "#22c55e"],
    ["JITTER", formattedJitter, "", "#22c55e"],
    ["DOWNLOAD", formattedDownload, "", "#16a34a"],
    ["UPLOAD", formattedUpload, "", "#0ea5e9"],
    ["PACKET LOSS", formattedLoss, "", "#ef476f"],
    ["ERROR RATE", "0.0021", "", "#8b5cf6"],
    ["C/N", formattedCn, "", "#a3e635"],
    ["SNR", formattedSnr, "", "#7c3aed"],
    ["ELEVATION ANGLE", formattedElevation, "", safeElevation < 35 ? "#facc15" : "#f8fafc"],
    ["AZIMUTH", formattedAzimuth, "", "#f8fafc"],
    ["PATH LOSS", formattedPathLoss, "", "#f8fafc"],
    ["LINK QUALITY", quality, "", qualityColor],
  ];

  const csvNotes = [
    `[10:21:03] ${selectedUtId} Elevation dropping`,
    `[10:21:05] ${selectedUtId} Signal ${quality.toLowerCase()}`,
    `[10:21:07] ${selectedUtId} Handover triggered`,
  ];

  const eventItems = [
    { time: "10:21:03", status: "reconnect", note: `${selectedUtId} reconnect stable`, detail: `Beam lock ${safeElevation < 35 ? "weak" : "stable"}` },
    { time: "10:21:05", status: "handover", note: `${selectedUtId} handover monitored`, detail: `Active satellite ${activeSat}` },
    { time: "10:21:07", status: safeLoss > 0.3 ? "packet loss spike" : "satellite switch", note: `${selectedUtId} satellite switch`, detail: `Loss ${safeLoss.toFixed(2)}%` },
  ];

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon name="satellite" className="text-blue-400" />
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <b className="block whitespace-nowrap text-white tracking-wider">VNU-LEO</b>
              <span className="block whitespace-nowrap truncate text-slate-300 font-medium">
                User Router Dashboard
              </span>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-950/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-100 shadow-[0_0_0_1px_rgba(6,182,212,0.12),0_6px_18px_rgba(2,6,23,0.35)]">
              <span className="text-cyan-300">UT</span>
              <select
                className="appearance-none rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-400"
                value={selectedUtId}
                onChange={(event) => setSelectedUtId(event.target.value)}
              >
                {["UT-1", "UT-2", "UT-3", "UT-4", "UT-5"].map((routerId) => (
                  <option key={routerId} value={routerId}>
                    {routerId}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none text-cyan-300">▼</span>
            </label>
          </div>
        </div>

        <div className="flex gap-4 text-sm text-slate-200">
          <span>Live</span>
          <span className="text-green-400 font-bold">● Online</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-6 p-4 bg-slate-900/40 border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-200">CSV Notes</h3>
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-slate-500">{selectedUtId}</span>
          </div>
          <div className="space-y-2 text-[11px] font-mono">
            {csvNotes.map((note) => (
              <div key={note} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-200">
                {note}
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-6 p-4 bg-slate-900/40 border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Event Log</h3>
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-slate-500">Live</span>
          </div>
          <div className="space-y-2 text-[11px] font-mono">
            {eventItems.map((entry) => (
              <div key={`${entry.time}-${entry.status}`} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-slate-400">
                  <span>{entry.time}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest ${entry.status === "packet loss spike" ? "bg-red-500/10 text-red-300" : entry.status === "handover" ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                    {entry.status}
                  </span>
                </div>
                <p className="mt-1 text-slate-200">{entry.note}</p>
                <p className="mt-1 text-[10px] text-slate-500">{entry.detail}</p>
              </div>
            ))}
          </div>
        </Card>
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
              <span className={`text-3xl font-black ${safeElevation < 35 ? "text-yellow-500 animate-pulse" : "text-white"}`}>{formattedElevation}</span>
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
          <SatelliteScene activeSat={activeSat} elevationAngle={safeElevation} />

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