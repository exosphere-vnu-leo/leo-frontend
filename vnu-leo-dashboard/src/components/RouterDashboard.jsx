import { useState } from "react";
import Card from "./Card";
import Icon from "./Icon";
import RealTimeChart from "./RealTimeChart";
import { useCsvTelemetry } from "../hooks/useCsvTelemetry";

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "nan") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRowValue(value, digits = 2) {
  const numericValue = toNumber(value);
  return numericValue === null ? null : numericValue.toFixed(digits);
}

function getSignalQualityPercent(sinrDb, lostLink) {
  if (lostLink || sinrDb === null) return 0;
  return Math.max(4, Math.min(100, Math.round(((sinrDb + 5) / 30) * 100)));
}

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

function SatelliteScene({ satelliteId, elevation = 0, selectedUtId, connected, lostLink, weakSignal, handoverDetected, signalQuality }) {
  const activeSat = satelliteId || "SAT-0123";
  const baseRotation = activeSat === "SAT-0123" ? 0 : activeSat === "SAT-0119" ? -34 : 34;
  const beamRotation = `${baseRotation + (45 - elevation) * 0.35}deg`;
  const clampedElevation = Math.max(0, Math.min(85, elevation));
  const satelliteOrbitX = 112 + (clampedElevation / 85) * 410;
  const satelliteOrbitY = 132 - Math.sin((clampedElevation / 85) * Math.PI * 0.95) * 78;
  const dishTilt = `rotate(${Math.max(-32, Math.min(32, 18 - clampedElevation * 0.35))}deg)`;
  const sceneBorder = lostLink ? "border-red-500/50" : weakSignal ? "border-yellow-500/40" : "border-slate-700/70";
  const sceneGlow = lostLink ? "shadow-[0_0_28px_rgba(239,68,68,0.15)]" : weakSignal ? "shadow-[0_0_28px_rgba(250,204,21,0.14)]" : "shadow-[0_0_28px_rgba(34,197,94,0.12)]";

  return (
    <div className={`relative h-82.5 overflow-hidden rounded-xl border ${sceneBorder} ${sceneGlow} bg-[radial-gradient(circle_at_center,#0b2847_0%,#06101f_45%,#020617_100%)]`}>
      <div
        className="absolute inset-0 opacity-18"
        style={{
          backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div className="absolute inset-x-0 bottom-14.5 h-px bg-linear-to-r from-transparent via-slate-300/50 to-transparent" />
      <div className={`absolute left-3 top-3 rounded-md border px-2 py-1 text-[10px] font-mono ${lostLink ? "border-red-500/30 bg-red-950/80 text-red-200" : weakSignal ? "border-yellow-500/30 bg-yellow-950/80 text-yellow-100" : "border-emerald-500/20 bg-emerald-950/70 text-emerald-100"}`}>
        {lostLink ? "LOST LINK" : handoverDetected ? "HANDOVER IN PROGRESS" : weakSignal ? "WEAK SIGNAL" : connected ? "TRACKING LOCKED" : "TRACKING"}
      </div>
      <div className="absolute right-3 top-3 rounded-md border border-cyan-500/20 bg-slate-950/80 px-2 py-1 text-[10px] font-mono text-cyan-100">
        Estimated Elevation: {clampedElevation.toFixed(1)}°
      </div>

      <svg className="absolute inset-0 h-full w-full pointer-events-none">
        <defs>
          <linearGradient id="elevBeamGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={lostLink ? "#f87171" : weakSignal ? "#facc15" : "#0ea5e9"} stopOpacity="0.12" />
            <stop offset="100%" stopColor={lostLink ? "#ef4444" : "#22c55e"} stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="orbitGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <path d="M 34 176 C 132 38, 488 38, 586 176" fill="none" stroke="url(#orbitGlow)" strokeWidth="1.8" strokeDasharray="7 8" opacity="0.85" />
        <path d="M 48 176 C 160 48, 460 48, 572 176" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 7" opacity="0.4" />
        <path d={`M 160 188 C 188 156, 246 120, ${satelliteOrbitX} ${satelliteOrbitY}`} fill="none" stroke="url(#elevBeamGrad)" strokeWidth="4" strokeLinecap="round" opacity={lostLink ? 0.35 : 0.95} />
        <path d={`M 160 188 C 188 156, 246 120, ${satelliteOrbitX} ${satelliteOrbitY}`} fill="none" stroke="#22c55e" strokeWidth="1.25" strokeLinecap="round" opacity={lostLink ? 0.12 : 0.42} />
        <path d={`M 160 188 L ${satelliteOrbitX} ${satelliteOrbitY}`} fill="none" stroke={lostLink ? "#ef4444" : weakSignal ? "#facc15" : "#22d3ee"} strokeWidth="1.3" strokeDasharray={lostLink ? "8 8" : "3 5"} opacity="0.8" />
        <circle cx={satelliteOrbitX} cy={satelliteOrbitY} r="15" fill={lostLink ? "rgba(239,68,68,0.18)" : "rgba(34,197,94,0.16)"} className="animate-pulse" />
        <circle cx={satelliteOrbitX} cy={satelliteOrbitY} r="9" fill={lostLink ? "#f87171" : weakSignal ? "#facc15" : "#22c55e"} />
        <circle cx={satelliteOrbitX} cy={satelliteOrbitY} r="3" fill="#020617" />
        <path d="M 116 180 Q 160 100 214 180" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4 6" opacity={connected ? 0.55 : 0.15} />
      </svg>

      <div
        className={`absolute -bottom-2.5 left-1/2 origin-bottom transition-all duration-1000 ease-in-out ${lostLink ? "animate-pulse" : ""}`}
        style={{
          transform: `translateX(-50%) rotate(${beamRotation})`,
          width: "96px",
          height: "236px",
          background: lostLink
            ? "linear-gradient(to top, rgba(239,68,68,0.45) 0%, transparent 100%)"
            : weakSignal
              ? "linear-gradient(to top, rgba(250,204,21,0.4) 0%, transparent 100%)"
              : "linear-gradient(to top, rgba(34, 211, 238, 0.42) 0%, transparent 100%)",
          clipPath: "polygon(44% 0, 56% 0, 100% 100%, 0 100%)",
          filter: "blur(2px)",
        }}
      />

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
              Elev: {isActive ? `${elevation.toFixed(1)}°` : positions[i].elev}
            </span>
          </div>
        );
      })}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="relative h-24 w-28">
          <div className="absolute bottom-0 left-1/2 h-4 w-20 -translate-x-1/2 rounded-b-3xl bg-slate-950/95 border border-slate-700 shadow-[0_0_0_1px_rgba(15,23,42,0.75),0_18px_26px_rgba(0,0,0,0.55)]" />
          <div className="absolute bottom-6 left-1/2 h-12 w-14 -translate-x-1/2 rounded-[50%] border border-slate-500/80 bg-linear-to-b from-slate-200 via-slate-500 to-slate-800 shadow-[0_0_20px_rgba(148,163,184,0.2)]" style={{ transform: dishTilt }} />
          <div className="absolute bottom-9 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-cyan-300/40 blur-sm" />
          <div className={`absolute bottom-9.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${lostLink ? "bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.9)]" : "bg-emerald-400 shadow-[0_0_14px_rgba(34,197,94,0.9)]"}`} />
          <div className="absolute bottom-6 left-1/2 h-12 w-0.5 -translate-x-1/2 bg-linear-to-t from-slate-500 to-transparent" />
          <div className="absolute bottom-10.5 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border border-cyan-400/15 animate-ping opacity-25" />
        </div>
        <div className={`mt-1 text-[9px] font-bold tracking-widest ${lostLink ? "text-red-400 animate-pulse" : weakSignal ? "text-yellow-300 animate-pulse" : "text-green-500 animate-pulse"}`}>
          {lostLink ? "LOST LINK" : handoverDetected ? "HANDOVER IN PROGRESS" : weakSignal ? "WEAK SIGNAL" : "TRACKING..."}
        </div>
        <div className="mt-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-mono text-cyan-200">
          {selectedUtId} • Elev {clampedElevation.toFixed(1)}°
        </div>
        <div className="mt-1 rounded-full border border-slate-600/40 bg-slate-950/80 px-2 py-0.5 text-[9px] font-mono text-slate-300">
          Signal {signalQuality}%
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
          className="absolute bottom-2.5 w-1 h-16 bg-linear-to-t from-green-500 to-transparent origin-bottom transition-transform duration-1000 ease-out"
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

function ElevationVisualization({ utId, satelliteId, elevation }) {
  const clampedElevation = Math.max(5, Math.min(85, elevation));
  const beamY = 188 - clampedElevation * 1.1;
  const beamEndX = 160 + clampedElevation * 1.7;
  const arcPath = `M 160 188 A 92 92 0 0 1 ${beamEndX} ${beamY}`;

  return (
    <Card className="p-4 bg-slate-950/40 border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-200">
          Elevation Angle
        </h3>
        <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-cyan-300">
          {utId} · {satelliteId}
        </span>
      </div>

      <div className="relative h-52.5 overflow-hidden rounded-xl border border-slate-800 bg-[radial-gradient(circle_at_top,#11263f_0%,#08111f_55%,#020617_100%)]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 210">
          <defs>
            <linearGradient id="elevBeamGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          <path d="M 20 188 H 300" stroke="#1e293b" strokeWidth="2" />
          <circle cx="160" cy="188" r="10" fill="#0f172a" stroke="#22c55e" strokeWidth="2" />
          <circle cx={beamEndX} cy={beamY} r="10" fill="#22c55e" opacity="0.95" />
          <path d={arcPath} fill="none" stroke="#facc15" strokeWidth="3" strokeDasharray="5 5" />
          <path d={`M 160 188 L ${beamEndX} ${beamY}`} stroke="url(#elevBeamGrad)" strokeWidth="5" strokeLinecap="round" />
          <path d={`M 160 188 L ${beamEndX} ${beamY}`} stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <path d="M 160 188 Q 160 124 212 82" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.55" />

          <text x="160" y="202" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">
            Router
          </text>
          <text x={beamEndX} y={Math.max(36, beamY - 12)} textAnchor="middle" fill="#86efac" fontSize="10" fontWeight="700">
            Satellite
          </text>
          <text x="214" y="86" textAnchor="start" fill="#fbbf24" fontSize="10" fontWeight="700">
            Elevation Angle: {clampedElevation.toFixed(1)}°
          </text>
        </svg>

        <div className="absolute left-3 top-3 rounded-md border border-cyan-500/20 bg-slate-950/70 px-2 py-1 text-[10px] font-mono text-cyan-100">
          Elevation Angle: {clampedElevation.toFixed(1)}°
        </div>
      </div>
    </Card>
  );
}

const ROUTER_OPTIONS = [1, 2, 3, 4, 5];

export default function RouterDashboard() {
  const { loading, data } = useCsvTelemetry();
  const [selectedNodeId, setSelectedNodeId] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  if (loading || !data) {
    return (
      <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-slate-300 text-center py-12">
        <p className="text-lg font-bold">Loading CSV telemetry...</p>
      </section>
    );
  }

  if (data.missingColumns.length > 0) {
    return (
      <section className="space-y-3 rounded-2xl border border-red-700/50 bg-red-950/30 p-3 text-red-300">
        <p className="font-bold text-lg">⚠ CSV Error</p>
        <p>Missing columns: {data.missingColumns.join(", ")}</p>
      </section>
    );
  }

  const selectedRowData = data.routerLatestById[selectedNodeId];
  const selectedUtId = `UT-${selectedNodeId}`;

  if (!selectedRowData) {
    return (
      <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-slate-300">
        <p>No data for {selectedUtId}</p>
      </section>
    );
  }

  const selectedRows = data.routerRowsById[selectedNodeId] ?? [];
  const previousRowData = selectedRows.at(-2) ?? null;
  const elevation = selectedRowData.elevation_deg ?? 0;
  const cnDb = selectedRowData.c_n_db ?? null;
  const sinrDb = selectedRowData.sinr_db ?? null;
  const fsplDb = selectedRowData.fspl_db ?? null;
  const atmLossDb = selectedRowData.atm_loss_db ?? null;
  const rxPowerDbw = selectedRowData.rx_power_dbw ?? null;
  const rxBytes = selectedRowData.rx_bytes ?? 0;
  const satId = selectedRowData.sat_id;
  const beamId = selectedRowData.beam_id;
  const connected = selectedRowData.connected;
  const lostLink = satId === -1;
  const weakSignal = !lostLink && sinrDb !== null && sinrDb < 8;
  const previousBeamId = toNumber(previousRowData?.beam_id);
  const handoverDetected = previousBeamId !== null && previousBeamId >= 0 && beamId >= 0 && previousBeamId !== beamId;
  const signalQuality = getSignalQualityPercent(sinrDb, lostLink);
  const latestTimestamp = formatRowValue(selectedRowData.time_s, 3) ?? "0.000";

  const combinedSeries = selectedRows
    .slice(-40)
    .map((row) => ({
      time: toNumber(row.time_s) ?? 0,
      sinr: toNumber(row.sinr_db),
      cn: toNumber(row.c_n_db),
      power: toNumber(row.rx_power_dbw),
    }))
    .filter((point) => Number.isFinite(point.time));

  const packetRows = selectedRows
    .slice()
    .reverse()
    .filter((row) => {
      const search = searchTerm.trim().toLowerCase();
      if (!search) return true;
      const rowText = [
        row.time_s,
        row.sat_id,
        row.beam_id,
        row.sinr_db,
        row.c_n_db,
        row.rx_power_dbw,
        row.fspl_db,
        row.rx_bytes,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase();
      return rowText.includes(search);
    })
    .slice(0, 10);

  const metricCards = [
    ["SAT ID", lostLink ? "LOST" : `${satId}`, "", lostLink ? "#ef4444" : "#22c55e"],
    ["BEAM ID", lostLink ? "LOST" : `${beamId}`, "", lostLink ? "#ef4444" : "#22c55e"],
    ["C/N", cnDb !== null ? `${cnDb.toFixed(2)}` : "N/A", "dB-Hz", "#a3e635"],
    ["FSPL", fsplDb !== null ? `${fsplDb.toFixed(2)}` : "N/A", "dB", "#0ea5e9"],
    ["ATM LOSS", atmLossDb !== null ? `${atmLossDb.toFixed(2)}` : "N/A", "dB", "#f59e0b"],
    ["RX POWER", rxPowerDbw !== null ? `${rxPowerDbw.toFixed(2)}` : "N/A", "dBW", "#16a34a"],
    ["SINR", sinrDb !== null ? `${sinrDb.toFixed(2)}` : "N/A", "dB", "#7c3aed"],
    ["RX BYTES", `${rxBytes}`, "bytes", "#ef476f"],
    ["ELEVATION", `${elevation.toFixed(1)}°`, "Estimated Elevation", elevation < 35 ? "#facc15" : "#f8fafc"],
    ["STATUS", lostLink ? "LOST LINK" : connected ? "CONNECTED" : "DISCONNECTED", "", lostLink ? "#ef4444" : connected ? "#22c55e" : "#f59e0b"],
  ];

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon name="satellite" className="text-blue-400" />
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <b className="block text-white tracking-wider whitespace-nowrap">VNU-LEO</b>
              <span className="block truncate text-slate-300 font-medium whitespace-nowrap">Router Dashboard (UT)</span>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-950/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-200 shadow-[0_0_0_1px_rgba(6,182,212,0.12),0_6px_18px_rgba(2,6,23,0.35)]">
              <span className="text-cyan-300">UT</span>
              <select
                className="appearance-none rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-400"
                value={selectedNodeId}
                onChange={(event) => setSelectedNodeId(Number(event.target.value))}
              >
                {ROUTER_OPTIONS.map((routerId) => (
                  <option key={routerId} value={routerId}>UT-{routerId}</option>
                ))}
              </select>
              <span className="pointer-events-none text-cyan-300">▼</span>
            </label>
          </div>
        </div>

        <div className="hidden text-sm text-slate-200 md:block" />
      </div>

      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-12 lg:col-span-5 p-4 bg-slate-900/45 border-slate-800 shadow-[0_0_25px_rgba(15,23,42,0.3)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Live Router Link</h3>
              <p className="mt-1 text-[9px] uppercase tracking-[0.35em] text-slate-500">{selectedRowData.time}</p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.3em] ${lostLink ? "border-red-500/30 bg-red-950/70 text-red-200" : weakSignal ? "border-yellow-500/30 bg-yellow-950/70 text-yellow-100" : "border-emerald-500/20 bg-emerald-950/60 text-emerald-100"}`}>
              {lostLink ? "LOST LINK" : handoverDetected ? "HANDOVER" : weakSignal ? "WEAK SIGNAL" : "LOCKED"}
            </span>
          </div>
          <div className="space-y-3">
            <div className={`rounded-xl border px-4 py-4 ${lostLink ? "border-red-500/30 bg-red-950/35" : weakSignal ? "border-yellow-500/25 bg-yellow-950/25" : "border-slate-700 bg-slate-950/55"}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`relative flex h-2.5 w-2.5 ${lostLink ? "opacity-100" : ""}`}>
                  <span className={`absolute inline-flex h-full w-full rounded-full ${lostLink ? "bg-red-400 animate-ping" : connected ? "bg-green-400 animate-ping" : "bg-yellow-400 animate-ping"} opacity-60`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${lostLink ? "bg-red-500" : connected ? "bg-green-500" : "bg-yellow-400"}`} />
                </span>
                <span className={`text-xs font-black uppercase tracking-[0.3em] ${lostLink ? "text-red-300" : connected ? "text-green-300" : "text-yellow-200"}`}>
                  {lostLink ? "LOST LINK" : connected ? "ACTIVE LINK" : "TRACKING"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-200">
                <div className="rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2">
                  <p className="text-slate-500 uppercase text-[9px] mb-1">Router</p>
                  <p className="text-lg font-black text-white">{selectedUtId}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2">
                  <p className="text-slate-500 uppercase text-[9px] mb-1">Satellite</p>
                  <p className="text-lg font-black text-white">{lostLink ? "--" : `SAT-${Math.max(0, satId)}`}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2">
                  <p className="text-slate-500 uppercase text-[9px] mb-2">Signal Quality</p>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${lostLink ? "bg-red-500" : weakSignal ? "bg-yellow-400" : "bg-emerald-400"}`} style={{ width: `${signalQuality}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">{signalQuality}%</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2">
                  <p className="text-slate-500 uppercase text-[9px] mb-1">Timestamp</p>
                  <p className="text-lg font-black text-white">{latestTimestamp}s</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                <div className={`rounded-md border px-2 py-1 text-center ${lostLink ? "border-red-500/30 text-red-200" : "border-slate-800"}`}>Sat</div>
                <div className={`rounded-md border px-2 py-1 text-center ${handoverDetected ? "border-amber-500/30 text-amber-200 animate-pulse" : "border-slate-800"}`}>Beam</div>
                <div className={`rounded-md border px-2 py-1 text-center ${weakSignal ? "border-yellow-500/30 text-yellow-200" : "border-slate-800"}`}>SINR</div>
                <div className={`rounded-md border px-2 py-1 text-center ${connected ? "border-emerald-500/30 text-emerald-200" : "border-slate-800"}`}>Link</div>
              </div>
              <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Last Update</div>
              <div className="mt-1 text-sm font-mono text-slate-200">{selectedRowData.time}</div>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4 p-4 bg-slate-950/40 border-slate-800">
          <ElevationVisualization
            utId={selectedUtId}
            satelliteId={lostLink ? "SAT--" : `SAT-${Math.max(0, satId)}`}
            elevation={elevation}
            connected={connected}
            lostLink={lostLink}
            weakSignal={weakSignal}
            handoverDetected={handoverDetected}
            signalQuality={signalQuality}
          />
        </Card>

        <Card className="col-span-12 lg:col-span-3 p-4 bg-slate-900/40 border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Connection Status</h3>
            <span className={`text-[9px] font-mono uppercase tracking-[0.3em] ${lostLink ? "text-red-400" : connected ? "text-green-400" : "text-yellow-300"}`}>{lostLink ? "ALARM" : connected ? "ONLINE" : "TRACKING"}</span>
          </div>
          <div className="space-y-2 text-[11px] font-mono">
            <div className={`rounded-lg border px-3 py-3 ${lostLink ? "border-red-500/30 bg-red-950/35" : weakSignal ? "border-yellow-500/25 bg-yellow-950/20" : "border-green-500/20 bg-green-950/30"}`}>
              <p className={`font-black uppercase tracking-[0.35em] ${lostLink ? "text-red-300" : weakSignal ? "text-yellow-200" : "text-green-300"}`}>{handoverDetected ? "HANDOVER IN PROGRESS" : lostLink ? "NO LINK" : connected ? "ACTIVE LINK" : "TRACKING"}</p>
              <p className="mt-3 text-slate-200 text-sm"><b>Router:</b> {selectedUtId}</p>
              <p className="text-slate-200 text-sm"><b>Satellite:</b> {lostLink ? "--" : `SAT-${Math.max(0, satId)}`}</p>
              <p className="text-slate-200 text-sm"><b>Beam:</b> {lostLink ? "--" : beamId}</p>
              <p className="mt-2 text-slate-400 font-semibold uppercase text-[10px]">Last Update</p>
              <p className="text-white font-mono text-sm">{selectedRowData.time}</p>
              {handoverDetected && <p className="mt-2 rounded-md border border-amber-500/25 bg-amber-950/30 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-amber-200 animate-pulse">HANDOVER IN PROGRESS</p>}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <Card className="p-4 text-sm bg-slate-900/45 border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-200 uppercase tracking-widest text-[10px]">CONNECTION</h3>
              <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.3em] ${lostLink ? "border-red-500/20 text-red-300" : weakSignal ? "border-yellow-500/20 text-yellow-200" : "border-green-500/20 text-green-300"}`}>
                <span className={`h-2 w-2 rounded-full ${lostLink ? "bg-red-500" : weakSignal ? "bg-yellow-400" : "bg-green-500"}`} />
                {lostLink ? "ALARM" : weakSignal ? "WEAK" : "OK"}
              </span>
            </div>
            <p className={`my-4 font-bold flex items-center gap-2 ${lostLink ? "text-red-400" : connected ? "text-green-400" : "text-yellow-300"}`}>
              <span className={`relative flex h-2 w-2 ${lostLink ? "opacity-100" : ""}`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${lostLink ? "bg-red-400" : "bg-green-400"} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${lostLink ? "bg-red-500" : "bg-green-500"}`}></span>
              </span>
              {handoverDetected ? "HANDOVER IN PROGRESS" : lostLink ? "LOST LINK" : connected ? "ACTIVE LINK" : "TRACKING"}
            </p>
            <p className="text-2xl font-black text-white">{selectedUtId}</p>
            <p className="mt-1 text-[11px] font-mono uppercase tracking-widest text-cyan-400">{lostLink ? "SAT--" : `SAT-${Math.max(0, satId)}`}</p>
            <div className="mt-2 flex flex-col">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-tighter">Estimated Elevation:</span>
              <span className={`text-3xl font-black ${elevation < 35 ? "text-yellow-500 animate-pulse" : "text-white"}`}>{elevation.toFixed(1)}°</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {["RX", "C/N", "SINR", "BYTES"].map((item, index) => (
                <span key={item} className={`rounded-md border px-2 py-1 text-center text-[9px] font-bold uppercase tracking-[0.25em] ${index === 0 ? "border-emerald-500/20 text-emerald-200" : "border-slate-700 text-slate-300"}`}>
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-4 text-slate-400 font-semibold uppercase text-[10px]">Data Time</p>
            <p className="text-white font-mono text-sm">{selectedRowData.time}</p>
          </Card>

          <GaugeCircle value={`${signalQuality}%`} label={lostLink ? "ALARM" : weakSignal ? "WEAK" : "GOOD"} />
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-3">
          <SatelliteScene
            satelliteId={lostLink ? "SAT--" : `SAT-${Math.max(0, satId)}`}
            elevation={elevation}
            selectedUtId={selectedUtId}
            connected={connected}
            lostLink={lostLink}
            weakSignal={weakSignal}
            handoverDetected={handoverDetected}
            signalQuality={signalQuality}
          />
          <Card className="p-4 bg-slate-950/40 border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 tracking-widest">Telemetry Trend</h3>
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-slate-500">Streaming CSV values</span>
            </div>
            {combinedSeries.length > 0 ? (
              <RealTimeChart
                data={combinedSeries}
                xDataKey="time"
                series={[
                  { key: "sinr", label: "SINR", color: "#22c55e" },
                  { key: "cn", label: "C/N", color: "#0ea5e9" },
                  { key: "power", label: "RX Power", color: "#f59e0b" },
                ]}
              />
            ) : (
              <div className="h-24 flex items-center justify-center text-slate-400 text-sm">No telemetry data</div>
            )}
            <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-slate-500">
              <span>Latest CSV Packet</span>
              <span>{selectedRowData.time}</span>
            </div>
            <div className="mt-2 space-y-1">
              <Spark color="#22c55e" />
              <Spark color="#0ea5e9" />
              <Spark color="#f59e0b" />
            </div>
          </Card>
        </div>
      </div>

      <Card className="grid grid-cols-2 gap-2 p-3 bg-slate-900/45 border-slate-800 md:grid-cols-5">
        {metricCards.map(([t, v, u, c]) => (
          <div key={t} className="rounded-lg border border-slate-800/90 bg-slate-950/60 p-3 shadow-inner">
            <p className="text-[10px] text-slate-400 font-bold leading-tight mb-1">{t}</p>
            <p className="text-xl font-black" style={{ color: c }}>{v}<span className="text-[10px] ml-1 opacity-80">{u}</span></p>
            <Spark color={c} />
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-12 gap-4 mt-3">
        <Card className="col-span-12 p-4 bg-slate-900/45 border-slate-800 shadow-inner">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Time Series Data</h3>
              <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-slate-500">Latest 10 packets, sorted by time</p>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">
              <span>Search</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="time, sinr, beam..."
                className="w-44 bg-transparent text-[11px] uppercase tracking-normal text-slate-100 outline-none placeholder:text-slate-600"
              />
            </label>
          </div>
          <div className="max-h-85 overflow-auto pr-1">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="sticky top-0 z-10 bg-slate-950/95 text-slate-400 uppercase tracking-[0.25em]">
                <tr className="border-b border-slate-800">
                  <th className="sticky top-0 bg-slate-950/95 py-3 font-semibold">TIME (s)</th>
                  <th className="sticky top-0 bg-slate-950/95 py-3 font-semibold">SINR (dB)</th>
                  <th className="sticky top-0 bg-slate-950/95 py-3 font-semibold">C/N (dB-Hz)</th>
                  <th className="sticky top-0 bg-slate-950/95 py-3 font-semibold">RX PWR (dBW)</th>
                  <th className="sticky top-0 bg-slate-950/95 py-3 font-semibold">FSPL (dB)</th>
                  <th className="sticky top-0 bg-slate-950/95 py-3 font-semibold">RX BYTES</th>
                </tr>
              </thead>
              <tbody>
                {packetRows.map((row, index) => {
                  const rowSinr = toNumber(row.sinr_db);
                  const isLatestRow = index === 0;
                  const sinrClass = rowSinr === null ? "text-slate-300" : rowSinr < 8 ? "text-red-300" : rowSinr < 15 ? "text-yellow-300" : "text-emerald-300";
                  return (
                    <tr
                      key={`${row.time_s}-${row.beam_id}-${index}`}
                      className={`border-b border-slate-800/40 transition-colors ${index % 2 === 0 ? "bg-white/1.5" : "bg-transparent"} ${isLatestRow ? "bg-cyan-500/10 ring-1 ring-inset ring-cyan-400/20" : "hover:bg-white/5"}`}
                    >
                      <td className="py-2 text-slate-300">{(toNumber(row.time_s) ?? 0).toFixed(3)}</td>
                      <td className={`py-2 font-bold ${sinrClass}`}>{rowSinr !== null ? rowSinr.toFixed(2) : "N/A"}</td>
                      <td className="py-2 text-slate-200">{toNumber(row.c_n_db) !== null ? toNumber(row.c_n_db).toFixed(2) : "N/A"}</td>
                      <td className="py-2 text-slate-200">{toNumber(row.rx_power_dbw) !== null ? toNumber(row.rx_power_dbw).toFixed(2) : "N/A"}</td>
                      <td className="py-2 text-slate-200">{toNumber(row.fspl_db) !== null ? toNumber(row.fspl_db).toFixed(2) : "N/A"}</td>
                      <td className="py-2 text-cyan-400 font-bold">{toNumber(row.rx_bytes) ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}