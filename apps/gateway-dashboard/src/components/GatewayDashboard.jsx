import CesiumTopologyView from "./CesiumTopologyView";
import Card from "./Card";
import Icon from "./Icon";

function GatewayDashboard({ activeSatId }) {
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

  const gatewayStats = [
    ["TOTAL SATELLITES", "36", ""],
    ["ALIVE", "34", "94.4%"],
    ["DEAD", "2", "5.6%"],
    ["TOTAL GATEWAYS", "3", "Online: 3"],
    ["CONNECTED ROUTERS", "128", "Online: 121"],
    ["TOTAL TRAFFIC", "1.26", "Tbps +12.4%"],
    ["AVG LATENCY", "41", "ms"],
  ];

  const nodeStatus = [
    { id: "SAT-0123", type: "Satellite", status: "Alive", latency: "38 ms", traffic: "320 Mbps" },
    { id: "SAT-0210", type: "Satellite", status: "Alive", latency: "43 ms", traffic: "280 Mbps" },
    { id: "SAT-0305", type: "Satellite", status: "Dead", latency: "-", traffic: "0 Mbps" },
    { id: "GW-HANOI", type: "Gateway", status: "Alive", latency: "22 ms", traffic: "600 Mbps" },
    { id: "RT-HCM-007", type: "Router", status: "Warning", latency: "65 ms", traffic: "55 Mbps" },
  ];

  return (
    <section className="h-full min-h-0 overflow-hidden space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase">
            2. GATEWAY DASHBOARD <span className="text-slate-500 font-normal">(Network Monitoring System)</span>
          </h2>
        </div>
        <div className="text-[11px] font-mono text-slate-300 flex items-center gap-4">
          <span>Local Time: 10:24:35</span>
          <span className="text-green-400 animate-pulse font-bold">⟳ Auto Refresh</span>
          <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 uppercase font-bold">Admin Mode</span>
        </div>
      </div>

      <div className="grid h-full min-h-0 grid-cols-12 gap-3">
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
        <div className="col-span-4 min-h-0 overflow-hidden rounded-xl border border-blue-500/30 bg-slate-950 relative group shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <div className="absolute top-3 left-3 z-10">
             <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2.5 rounded shadow-xl text-[9px] uppercase font-bold text-slate-200">
                <p className="text-cyan-400 mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"/>
                  3D Topology View
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Active Uplink:</span>
                  <span className="text-green-400 font-mono">{activeSatId}</span>
                </div>
             </div>
          </div>
          <CesiumTopologyView currentSatId={activeSatId} />
        </div>

        {/* Stats Grid & Tables */}
        <div className="col-span-7 min-h-0 grid grid-cols-7 gap-3">
          {gatewayStats.map(([t, v, u], i) => (
            <Card key={t} className="col-span-1 p-3 bg-slate-900/60 border-slate-800 hover:border-slate-600 transition-colors">
              <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight mb-1">{t}</p>
              <p className={`text-xl font-black tracking-tighter ${i === 2 ? 'text-red-500' : i === 1 ? 'text-green-400 shadow-green-500/20' : 'text-white'}`}>{v}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-1">{u}</p>
            </Card>
          ))}

          {/* Node Status Table */}
          <Card className="col-span-4 p-4 bg-slate-950/40 border-slate-800">
            <h3 className="mb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"/> 
              NODE STATUS
            </h3>
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-500 font-bold uppercase text-[9px] border-b border-slate-800">
                <tr>
                  <th className="pb-2">Node ID</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Latency</th>
                  <th className="pb-2">Traffic</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {nodeStatus.map(r => {
                  const isActive = r.id === activeSatId;
                  return (
                    <tr className={`border-t border-slate-800/50 transition-all ${isActive ? 'bg-green-500/10' : 'hover:bg-white/5'}`} key={r.id}>
                      <td className={`py-2.5 font-bold ${isActive ? 'text-green-400' : 'text-slate-200'}`}>
                        {isActive && <span className="mr-1 animate-pulse">▶</span>}{r.id}
                      </td>
                      <td className="py-2.5 text-slate-400 text-[10px]">{r.type}</td>
                      <td className={`py-2.5 ${r.status === 'Alive' ? 'text-green-500' : r.status === 'Dead' ? 'text-red-500' : 'text-yellow-500'}`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 shadow-[0_0_5px_currentColor]"/>
                        {r.status}
                      </td>
                      <td className="py-2.5 text-slate-300">{r.latency}</td>
                      <td className="py-2.5 text-blue-400 font-bold">{r.traffic}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Traffic Sparklines */}
          <Card className="col-span-3 p-4 bg-slate-950/40 border-slate-800 flex flex-col justify-between">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">NETWORK PULSE</h3>
            <div className="space-y-3 py-2">
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-slate-500 uppercase">Throughput</span>
                  <span className="text-green-400 font-bold">STABLE</span>
                </div>
                <div className="space-y-1">
                  <Spark color="#7c3aed"/><Spark color="#0ea5e9"/><Spark color="#22c55e"/>
                </div>
            </div>
          </Card>

          {/* Handover Logs */}
          <Card className="col-span-7 p-4 bg-slate-950/40 border-slate-800">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">HANDOVER HISTORY</h3>
               <div className="flex items-center gap-2">
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                 </span>
                 <span className="text-[9px] font-mono text-blue-400 font-bold uppercase tracking-tighter">Live Monitor</span>
               </div>
            </div>
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="text-slate-500 text-[9px] uppercase border-b border-slate-800">
                <tr>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Router</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Destination</th>
                  <th className="pb-2">Gateway</th>
                  <th className="pb-2 text-right">Downtime</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  ["10:24:11","RT-HN-001","SAT-0119", activeSatId,"GW-HANOI","120 ms"],
                  ["10:23:02","RT-DN-003","SAT-0156","SAT-0168","GW-DANANG","98 ms"],
                  ["10:22:45","RT-HCM-007","SAT-0231","SAT-0210","GW-HCM","110 ms"]
                ].map((r, i) => (
                  <tr className="border-t border-slate-800/50 hover:bg-white/5 transition-colors" key={i}>
                    {r.map((c, j) => (
                      <td className={`py-2.5 ${j === 5 ? 'text-right text-cyan-400 font-bold' : j === 3 ? 'text-green-400 font-bold' : ''}`} key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Spark({ color = "#22c55e" }) {
  return (
    <svg viewBox="0 0 120 28" className="h-8 w-full opacity-90 filter drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]">
      <polyline 
        fill="none" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        points="0,18 12,16 22,17 33,11 43,15 55,13 66,7 77,14 88,9 100,13 112,8 120,10" 
      />
    </svg>
  );
}

export default GatewayDashboard;