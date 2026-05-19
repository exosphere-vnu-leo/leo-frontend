import { useEffect, useRef, useState } from "react";
import NetworkCesium from "./NetworkCesium";
import { detectHandovers } from "../utils/handoverUtils";
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

function getGatewaySignalState(satId, sinrDb, rxBytes) {
  if (satId === -1 || rxBytes === 0) return "Dead";
  if (sinrDb !== null && sinrDb < 8) return "Warning";
  return "Alive";
}

function GatewayDashboard() {
  const { loading, data } = useCsvTelemetry();
  const [selectedHandover, setSelectedHandover] = useState(null);
  const handovers = detectHandovers(data?.rows || []);
  const rafRef = useRef(null);
  const lastRef = useRef(null);
  const isLoading = loading || !data;
  const hasCsvError = !isLoading && data.missingColumns.length > 0;
  const safeData = data ?? {
    rows: [],
    gatewayRows: [],
    gatewayLatest: null,
    gatewaySeries: { sinr_db: [], rx_bytes: [], rx_power_dbw: [] },
    missingColumns: [],
  };

  // Playback state (initialized safely regardless of data presence)
  const times = (safeData.rows || [])
    .map((r) => {
      const v = Number(String(r.time_s || '').trim())
      return Number.isFinite(v) ? v : null
    })
    .filter((v) => v !== null)
    .sort((a, b) => a - b);

  const minTime = times[0] ?? 0
  const maxTime = times.length ? times[times.length - 1] : 0

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(maxTime)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [loopPlayback, setLoopPlayback] = useState(false)

  // RAF-driven playback progression
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
      return
    }
    lastRef.current = performance.now()
    const step = (now) => {
      const dt = (now - lastRef.current) / 1000
      lastRef.current = now
      setCurrentTime((prev) => {
        let next = prev + dt * playbackSpeed
        if (next >= maxTime) {
          if (loopPlayback) next = minTime
          else {
            next = maxTime
            setIsPlaying(false)
          }
        }
        return next
      })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
    }
  }, [isPlaying, playbackSpeed, maxTime, loopPlayback, minTime])

  // Playback subset rows
  const playbackRows = (safeData.rows || []).filter((r) => {
    const t = Number(currentTime)
    const v = Number(String(r.time_s || '').trim());
    return Number.isFinite(v) && v <= t
  })

  const gwLatest = safeData.gatewayLatest;
  const gwSeries = safeData.gatewaySeries;
  const gwRows = safeData.gatewayRows ?? [];
  const metricsSourceRows = isPlaying ? playbackRows : (safeData.rows ?? []);
  const metricsGwRows = isPlaying ? metricsSourceRows.filter((row) => String(row.node_type).trim() === 'GW') : gwRows;
  const numeric = (rows, key) => rows.map((row) => toNumber(row[key])).filter((value) => Number.isFinite(value));
  const avg = (vals) => (vals.length ? vals.reduce((sum, value) => sum + value, 0) / vals.length : null);
  const sum = (vals) => vals.reduce((sum, value) => sum + value, 0);
  const uniqueCount = (vals) => new Set(vals.filter((value) => Number.isFinite(value) && value >= 0)).size;
  const source = metricsGwRows.length ? metricsGwRows : gwRows;
  const gw = {
    averageSinr: avg(numeric(source, 'sinr_db')),
    averageCn: avg(numeric(source, 'c_n_db')),
    averageRxPower: avg(numeric(source, 'rx_power_dbw')),
    totalRxBytes: sum(numeric(source, 'rx_bytes')),
    activeSatellites: uniqueCount(numeric(source, 'sat_id')),
    activeBeams: uniqueCount(numeric(source, 'beam_id')),
  };
  const recentRows = metricsGwRows.slice(-24);
  const telemetryRows = gwRows
    .slice(-40)
    .map((row) => ({
      time: toNumber(row.time_s) ?? 0,
      sinr: toNumber(row.sinr_db),
      power: toNumber(row.rx_power_dbw),
      bytes: toNumber(row.rx_bytes),
    }))
    .filter((point) => Number.isFinite(point.time));

  // Stats cards with actual CSV data
  const weakCount = metricsSourceRows.filter((row) => {
    const sinr = toNumber(row.sinr_db);
    return Number.isFinite(sinr) && sinr < 10;
  }).length;
  const disconnectedCount = metricsSourceRows.filter((row) => Number(toNumber(row.sat_id)) === -1).length;

  const gatewayStats = [
    ["AVG SINR", gw.averageSinr !== null ? `${gw.averageSinr.toFixed(2)}` : "N/A", "dB"],
    ["AVG C/N", gw.averageCn !== null ? `${gw.averageCn.toFixed(2)}` : "N/A", "dB-Hz"],
    ["AVG RX PWR", gw.averageRxPower !== null ? `${gw.averageRxPower.toFixed(2)}` : "N/A", "dBW"],
    ["TOTAL RX BYTES", `${gw.totalRxBytes}`, "bytes"],
    ["ACTIVE SATS", `${gw.activeSatellites}`, "satellites"],
    ["ACTIVE BEAMS", `${gw.activeBeams}`, "beams"],
  ];

  // Node status from latest rows
  const nodeStatus = gwRows.slice(-5).reverse().map((row, idx) => {
    const satId = toNumber(row.sat_id);
    const sinrValue = toNumber(row.sinr_db);
    const rxBytes = toNumber(row.rx_bytes) ?? 0;
    const status = getGatewaySignalState(satId ?? -1, sinrValue, rxBytes);

    return {
      id: `GW-${idx + 1}`,
      type: row.node_type || "Gateway",
      status,
      signal: sinrValue !== null ? `${sinrValue.toFixed(1)} dB` : "N/A",
      traffic: `${rxBytes} bytes`,
    };
  }).slice(0, 5);

  const nav = [
    ["home", "Overview"],
    ["satellite", "Satellites"],
    ["antenna", "Gateways"],
    ["router", "Routers"],
    ["activity", "Traffic"],
    ["wifi", "Handover Logs"],
    ["alert", "Alerts"],
    ["settings", "Settings"]
  ];

  if (isLoading) {
    return (
      <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-slate-300 text-center py-12">
        <p className="text-lg font-bold">Loading Gateway data...</p>
      </section>
    );
  }

  if (hasCsvError) {
    return (
      <section className="space-y-3 rounded-2xl border border-red-700/50 bg-red-950/30 p-3 text-red-300">
        <p className="font-bold text-lg">⚠ CSV Error</p>
        <p>Missing columns: {safeData.missingColumns.join(", ")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase">
            2. GATEWAY DASHBOARD <span className="text-slate-500 font-normal">(CSV Telemetry Data)</span>
          </h2>
        </div>
        <div className="text-[11px] font-mono text-slate-300 flex items-center gap-4">
          <span>{isPlaying ? `PLAYBACK MODE` : `LIVE / LATEST MODE`}</span>
          <span>Last Update: {isPlaying ? `${currentTime.toFixed(1)}` : (gwLatest?.time || "--")}</span>
          <span className="text-green-400 animate-pulse font-bold">⟳ Auto Refresh</span>
          <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 uppercase font-bold">Data Mode</span>
        </div>
      </div>

      {/* Telemetry Playback Panel */}
      <Card className="p-3 bg-slate-950/40 border-slate-800">
        <div className="flex flex-wrap items-center gap-2 justify-between mb-3">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Telemetry Playback</h3>
          <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] ${isPlaying ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'}`}>
            {isPlaying ? 'PLAYBACK MODE' : `PAUSED AT time_s = ${currentTime.toFixed(1)}`}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 items-center text-[11px] text-slate-300">
          <button className="col-span-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 hover:bg-slate-800" onClick={() => setIsPlaying((v) => !v)}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button className="col-span-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 hover:bg-slate-800" onClick={() => { setIsPlaying(false); setCurrentTime(minTime); }}>Reset</button>
          <label className="col-span-2 flex items-center gap-2">
            <span className="text-slate-500 uppercase text-[9px]">Speed</span>
            <select className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))}>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
            </select>
          </label>
          <label className="col-span-5 flex items-center gap-2">
            <span className="text-slate-500 uppercase text-[9px]">Timeline</span>
            <input className="w-full" type="range" min={minTime} max={maxTime} step={0.1} value={currentTime} onChange={(e) => { setIsPlaying(false); setCurrentTime(Number(e.target.value)); }} />
          </label>
          <label className="col-span-1 flex items-center gap-2 text-[10px] uppercase text-slate-400">
            <input type="checkbox" checked={loopPlayback} onChange={(e) => setLoopPlayback(e.target.checked)} /> Loop
          </label>
          <div className="col-span-2 text-right text-slate-400 font-mono text-[11px]">{currentTime.toFixed(1)} / {maxTime.toFixed(1)}s</div>
          <div className="col-span-12 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.25em] text-slate-400">
            <span>Rows in frame: {playbackRows.length}</span>
            <span>Weak: {weakCount}</span>
            <span>Disconnected: {disconnectedCount}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-3">
        {/* Sidebar Navigation */}
        <aside className="col-span-1 space-y-1 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
          {nav.map(([iconName, n], i) => (
            <div key={n} className={`flex flex-col items-center justify-center gap-1 rounded-lg py-3 transition-all cursor-pointer ${i === 0 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(37,99,235,0.2)]' : 'text-slate-500 hover:bg-slate-800'}`}>
              <Icon name={iconName} size={18}/>
              <span className="text-[9px] font-bold uppercase tracking-tighter">{n}</span>
            </div>
          ))}
        </aside>

        {/* 3D NETWORK GLOBE */}
        <div className="col-span-4 overflow-hidden rounded-xl border border-blue-500/30 bg-slate-950 relative group shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <div className="absolute top-3 left-3 z-10">
             <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2.5 rounded shadow-xl text-[9px] uppercase font-bold text-slate-200">
                <p className="text-cyan-400 mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"/>
                  3D Topology View
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Data Points:</span>
                  <span className="text-green-400 font-mono">{safeData.rows.length}</span>
                </div>
             </div>
          </div>
          <NetworkCesium
            data={data}
            currentSatId={`SAT-${gwLatest?.sat_id >= 0 ? gwLatest.sat_id : 0}`}
            selectedHandover={selectedHandover}
            playbackRows={playbackRows}
            isPlayback={isPlaying}
            currentTime={currentTime}
            trackActiveHandover={true}
          />
        </div>

        {/* Handover History Panel */}
        <aside className="col-span-7">
          <Card className="col-span-6 p-3 bg-slate-900/60 border-slate-800">
            <h3 className="mb-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">Handover History</h3>
            {handovers.length === 0 ? (
              <div className="text-slate-400 text-sm p-6">No handover events detected</div>
            ) : (
              <div className="max-h-52 overflow-auto text-sm font-mono border border-slate-800 rounded">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="px-2 py-2">Time</th>
                      <th className="px-2 py-2">Node</th>
                      <th className="px-2 py-2">Old Sat</th>
                      <th className="px-2 py-2">New Sat</th>
                      <th className="px-2 py-2">Old Beam</th>
                      <th className="px-2 py-2">New Beam</th>
                      <th className="px-2 py-2">SINR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handovers.slice().reverse().map((h, idx) => (
                      <tr
                        key={`${h.node_id}-${h.time_s}-${idx}`}
                        className="border-b border-slate-800 hover:bg-white/3 cursor-pointer"
                        onClick={() => setSelectedHandover(h)}
                      >
                        <td className="px-2 py-2 text-slate-300">{h.time_s ?? "--"}</td>
                        <td className="px-2 py-2 text-slate-300">{h.node_id}</td>
                        <td className="px-2 py-2 text-amber-400">{h.old_sat_id ?? "--"}</td>
                        <td className="px-2 py-2 text-emerald-400">{h.new_sat_id ?? "--"}</td>
                        <td className="px-2 py-2 text-amber-300">{h.old_beam_id ?? "--"}</td>
                        <td className="px-2 py-2 text-emerald-300">{h.new_beam_id ?? "--"}</td>
                        <td className="px-2 py-2 text-slate-300">{h.sinr_db ?? "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </aside>

        {/* Stats Grid & Tables */}
        <div className="col-span-7 grid grid-cols-6 gap-3">
          {gatewayStats.map(([t, v, u]) => (
            <Card key={t} className="col-span-1 p-3 bg-slate-900/60 border-slate-800 hover:border-slate-600 transition-colors">
              <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight mb-1">{t}</p>
              <p className={`text-lg font-black tracking-tighter text-white`}>{v}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-1">{u}</p>
            </Card>
          ))}

          {/* Node Status Table */}
          <Card className="col-span-3 p-4 bg-slate-950/40 border-slate-800">
            <h3 className="mb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"/> 
              GATEWAY STATUS
            </h3>
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-500 font-bold uppercase text-[9px] border-b border-slate-800">
                <tr>
                  <th className="pb-2">Node</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Signal</th>
                  <th className="pb-2">Traffic</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {nodeStatus.map(r => (
                  <tr className="border-t border-slate-800/50 hover:bg-white/5 transition-all" key={r.id}>
                    <td className="py-2.5 font-bold text-slate-200">{r.id}</td>
                    <td className="py-2.5 text-slate-400 text-[10px]">{r.type}</td>
                    <td className={`py-2.5 ${r.status === 'Alive' ? 'text-green-500' : r.status === 'Warning' ? 'text-yellow-300' : 'text-red-500'}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 shadow-[0_0_5px_currentColor]"/>
                      {r.status}
                    </td>
                    <td className="py-2.5 text-slate-300">{r.signal}</td>
                    <td className="py-2.5 text-cyan-300">{r.traffic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Chart: Average SINR */}
          <Card className="col-span-3 p-4 bg-slate-950/40 border-slate-800">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">AVG SINR TREND</h3>
            {gwSeries.sinr_db && gwSeries.sinr_db.length > 0 ? (
              <RealTimeChart data={gwSeries.sinr_db.map((point) => ({ ...point, val: point.value }))} dataKey="val" color="#22c55e" />
            ) : (
              <div className="h-16 flex items-center justify-center text-slate-400 text-sm">No SINR data</div>
            )}
            <div className="mt-2 text-[9px] text-slate-400 font-mono">Last: {gw.averageSinr !== null ? `${gw.averageSinr.toFixed(2)} dB` : "N/A"}</div>
          </Card>

          {/* Chart: Total RX Bytes */}
          <Card className="col-span-3 p-4 bg-slate-950/40 border-slate-800">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">RX BYTES TOTAL</h3>
            {gwSeries.rx_bytes && gwSeries.rx_bytes.length > 0 ? (
              <RealTimeChart data={gwSeries.rx_bytes.map((point) => ({ ...point, val: point.value }))} dataKey="val" color="#0ea5e9" />
            ) : (
              <div className="h-16 flex items-center justify-center text-slate-400 text-sm">No RX Bytes data</div>
            )}
            <div className="mt-2 text-[9px] text-slate-400 font-mono">Total: {gw.totalRxBytes} bytes</div>
          </Card>

          {/* Chart: RX Power */}
          <Card className="col-span-3 p-4 bg-slate-950/40 border-slate-800">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">RX POWER</h3>
            {gwSeries.rx_power_dbw && gwSeries.rx_power_dbw.length > 0 ? (
              <RealTimeChart data={gwSeries.rx_power_dbw.map((point) => ({ ...point, val: point.value }))} dataKey="val" color="#f59e0b" />
            ) : (
              <div className="h-16 flex items-center justify-center text-slate-400 text-sm">No RX Power data</div>
            )}
            <div className="mt-2 text-[9px] text-slate-400 font-mono">Last: {gw.averageRxPower !== null ? `${gw.averageRxPower.toFixed(2)} dBW` : "N/A"}</div>
          </Card>

          <Card className="col-span-6 p-4 bg-slate-950/40 border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">BEAM / POWER TIMELINE</h3>
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-slate-500">Latest 40 packets</span>
            </div>
            {telemetryRows.length > 0 ? (
              <RealTimeChart
                data={telemetryRows}
                xDataKey="time"
                series={[
                  { key: "sinr", label: "SINR", color: "#22c55e" },
                  { key: "power", label: "RX Power", color: "#f59e0b" },
                ]}
              />
            ) : (
              <div className="h-16 flex items-center justify-center text-slate-400 text-sm">No timeline data</div>
            )}
            <div className="mt-3 grid grid-cols-6 gap-1">
              {recentRows.map((row, index) => {
                const sinrValue = toNumber(row.sinr_db);
                const barHeight = Math.max(18, Math.min(100, ((sinrValue ?? 0) + 5) * 3));
                const tone = sinrValue === null ? "bg-slate-700" : sinrValue < 8 ? "bg-red-400" : sinrValue < 15 ? "bg-yellow-400" : "bg-emerald-400";
                return (
                  <div key={`${row.time_s}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                    <div className="mb-2 flex items-end gap-1 h-24">
                      <div className={`w-full rounded-t ${tone} shadow-[0_0_10px_rgba(34,197,94,0.12)]`} style={{ height: `${barHeight}%` }} />
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">{toNumber(row.time_s)?.toFixed(1) ?? "--"}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default GatewayDashboard;