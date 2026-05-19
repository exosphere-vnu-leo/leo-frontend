import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three"; // Cần import THREE để cấu hình ánh sáng


// Gateway (trạm mặt đất)
const gateways = [
  { id: "GW-HANOI", lat: 21.0285, lng: 105.8542, label: "Main Station" },
  { id: "GW-DANANG", lat: 16.0544, lng: 108.2022, label: "Relay Node" },
  { id: "GW-HOCHIMINH", lat: 10.8231, lng: 106.6297, label: "Southern Hub" },
  // Fake thêm gateway
  { id: "GW-HAIPHONG", lat: 20.8449, lng: 106.6881, label: "Backup GW" },
  { id: "GW-CANTHO", lat: 10.0452, lng: 105.7469, label: "Remote GW" },
];

// Router (node trung gian)
const routers = [
  { id: "RT-01", lat: 18.5, lng: 105.5, label: "Router 1" },
  { id: "RT-02", lat: 14.5, lng: 109.0, label: "Router 2" },
  { id: "RT-03", lat: 12.0, lng: 108.0, label: "Router 3" },
  { id: "RT-04", lat: 22.0, lng: 100.0, label: "Router 4" },
  { id: "RT-05", lat: 8.0, lng: 104.0, label: "Router 5" },
];

// Tạo nhiều satellite giả lập
const NUM_SAT = 18;
const initialSatellites = Array.from({ length: NUM_SAT }, (_, i) => {
  return {
    id: `SAT-${1000 + i}`,
    orbit: i % 3,
    phase: (i * 360 / NUM_SAT) % 360,
    dead: i === 5 // 1 satellite "chết" để test màu đỏ
  };
});

function orbitToPosition(orbit, phase) {
  const angle = (phase * Math.PI) / 180;
  const orbitLatOffset = [-30, 0, 30][orbit % 3];
  const lat = Math.sin(angle) * 45 + orbitLatOffset; 
  const lng = ((phase * 1.5 + orbit * 120) % 360) - 180;
  return { lat, lng };
}

export default function NetworkGlobe({ currentSatId = "SAT-0123" }) {
  const globeRef = useRef();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let requestRef;
    const animate = () => {
      setTick((t) => t + 0.02);
      requestRef = requestAnimationFrame(animate);
    };
    requestRef = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const globe = globeRef.current;
    
    // Cấu hình điều khiển
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;
    globe.controls().enableZoom = false;
    
    // TẬP TRUNG LÀM SÁNG: Thêm ánh sáng vào Scene
    const scene = globe.scene();
    
    // 1. Ambient Light: Chiếu sáng mọi ngóc ngách để xóa vùng tối đen
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
    scene.add(ambientLight);

    // 2. Directional Light: Ánh sáng định hướng tạo độ bóng cho địa hình
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(1, 1, 1);
    scene.add(sunLight);

    globe.pointOfView({ lat: 16, lng: 108, altitude: 2.1 }, 1000);
  }, []);


  // Satellite động
  const satellites = useMemo(() => {
    return initialSatellites.map((sat) => {
      const pos = orbitToPosition(sat.orbit, sat.phase + tick * 20);
      const isActive = sat.id === currentSatId;
      return {
        ...sat,
        ...pos,
        altitude: isActive ? 0.35 : 0.25,
        size: isActive ? 1.5 : 0.8,
        color: sat.dead ? "#ef4444" : isActive ? "#22ff22" : "#22ff22", // 🟢 xanh lá cho satellite
        active: isActive,
        type: "satellite"
      };
    });
  }, [tick, currentSatId]);

  // Gateway node
  const gatewayPoints = gateways.map(gw => ({
    ...gw,
    altitude: 0.01,
    size: 1.1,
    color: "#2563eb", // 🔵 xanh dương
    type: "gateway"
  }));

  // Router node
  const routerPoints = routers.map(rt => ({
    ...rt,
    altitude: 0.01,
    size: 0.9,
    color: "#fde047", // 🟡 vàng
    type: "router"
  }));

  // Tổng hợp tất cả node
  const points = useMemo(() => [
    ...gatewayPoints,
    ...routerPoints,
    ...satellites
  ], [satellites]);

  const arcs = useMemo(() => {
    const activeSat = satellites.find(s => s.active);
    const mainGW = gateways[0];
    if (!activeSat) return [];
    return [{
      startLat: mainGW.lat, startLng: mainGW.lng,
      endLat: activeSat.lat, endLng: activeSat.lng,
      color: ["#22c55e", "#00ff88"]
    }];
  }, [satellites]);

  return (
    <div className="relative h-full w-full min-h-[500px] flex justify-center items-center overflow-hidden bg-slate-950">
      <Globe
        ref={globeRef}
        width={500}
        height={500}
        backgroundColor="rgba(0,0,0,0)"
        
        // SỬA TẠI ĐÂY: Dùng bản đồ sáng (Marble) thay vì bản đồ đêm (Night)
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        
        // TĂNG ĐỘ RỰC RỠ KHÍ QUYỂN
        showAtmosphere={true}
        atmosphereColor="#4facfe"
        atmosphereDaylightAlpha={0.7} // Tăng mạnh để cầu sáng rõ

        pointsData={points}
        pointAltitude="altitude"
        pointColor="color"
        pointRadius="size"
        pointsMerge={false}


        // Hiện label cho tất cả node
        labelsData={points}
        labelLat="lat" labelLng="lng" labelText="id"
        labelSize={1.3}
        labelColor="color"
        labelAltitude={d => d.altitude + 0.05}
        labelDotRadius={0}

        arcsData={arcs}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={0.2}
        arcDashAnimateTime={1200}
        arcStroke={2.5}
        arcAltitude={0.4}
      />

      {/* Overlay chú thích sáng hơn */}
      <div className="absolute top-4 left-4 p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 text-[10px] text-white backdrop-blur-md pointer-events-none">
        <h4 className="font-black text-cyan-400 mb-3 uppercase tracking-tighter">Live Orbital View</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22ff22] shadow-[0_0_12px_#22ff22] animate-pulse"/> 
            <span className="font-bold text-slate-100 uppercase tracking-tight">Satellite (🟢)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"/> 
            <span className="text-slate-200">Gateway (🔵)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#fde047]"/> 
            <span className="text-slate-200">Router (🟡)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_5px_#ef4444]"/> 
            <span className="text-slate-200">Critical Alert (Satellite lỗi)</span>
          </div>
        </div>
      </div>
    </div>
  );
}