import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cartesian3,
  Color,
  EllipsoidTerrainProvider,
  Math as CesiumMath,
  OpenStreetMapImageryProvider,
  PolylineDashMaterialProperty,
  PolylineGlowMaterialProperty,
} from "cesium";
import {
  CylinderGraphics,
  EllipseGraphics,
  Entity,
  PointGraphics,
  PolylineGraphics,
  Viewer,
} from "resium";

// Mock data giữ nguyên từ NetworkGlobe (chỉ bổ sung tối thiểu field cần cho Cesium)
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

// Antenna nodes (bổ sung tối thiểu)
// Ở bản hiện tại chưa có antenna riêng, nên tạo antenna gắn với GW chính.
const antennas = [
  {
    id: "ANT-GW-HANOI",
    lat: gateways[0].lat,
    lng: gateways[0].lng,
    beamAngleDeg: 30,
  },
];

// Tạo nhiều satellite giả lập
const NUM_SAT = 18;
const initialSatellites = Array.from({ length: NUM_SAT }, (_, i) => {
  return {
    id: `SAT-${1000 + i}`,
    orbit: i % 3,
    phase: (i * 360) / NUM_SAT,
    dead: i === 5, // 1 satellite "chết" để test màu đỏ
  };
});

function orbitToPosition(orbit, phase) {
  const angle = (phase * Math.PI) / 180;
  const orbitLatOffset = [-30, 0, 30][orbit % 3];
  const lat = Math.sin(angle) * 45 + orbitLatOffset;
  const lng = ((phase * 1.5 + orbit * 120) % 360) - 180;
  return { lat, lng };
}

function toCartesian({ lat, lng, heightM = 0 }) {
  return Cartesian3.fromDegrees(lng, lat, heightM);
}

function calcFootprintRadiusM(altitudeM, halfAngleDeg) {
  const halfAngleRad = (halfAngleDeg * Math.PI) / 180;
  return Math.max(1, altitudeM * Math.tan(halfAngleRad));
}

export default function CesiumGatewayMap({ currentSatId = "SAT-0123" }) {
  const viewerRef = useRef(null);
  const hasSetInitialCamera = useRef(false);
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

  // Satellite động (bổ sung altitude)
  const satellites = useMemo(() => {
    const baseAltM = 550_000; // ~LEO (m)
    return initialSatellites.map((sat) => {
      const pos = orbitToPosition(sat.orbit, sat.phase + tick * 20);
      const isActive = sat.id === currentSatId;
      return {
        ...sat,
        ...pos,
        altitudeM: isActive ? baseAltM + 60_000 : baseAltM,
        size: isActive ? 10 : 6,
        color: sat.dead ? Color.fromCssColorString("#ef4444") : Color.fromCssColorString("#22ff22"),
        active: isActive,
        type: "satellite",
      };
    });
  }, [tick, currentSatId]);

  const gatewayPoints = useMemo(
    () =>
      gateways.map((gw) => ({
        ...gw,
        altitudeM: 0,
        size: 8,
        color: Color.fromCssColorString("#2563eb"),
        type: "gateway",
      })),
    []
  );

  // Router trong mock hiện tại có thể coi như "antenna/edge node" hiển thị riêng.
  const routerPoints = useMemo(
    () =>
      routers.map((rt) => ({
        ...rt,
        altitudeM: 0,
        size: 7,
        color: Color.fromCssColorString("#fde047"),
        type: "router",
      })),
    []
  );

  const antennaPoints = useMemo(
    () =>
      antennas.map((a) => ({
        ...a,
        altitudeM: 0,
        size: 9,
        color: Color.fromCssColorString("#0ea5e9"),
        type: "antenna",
      })),
    []
  );

  const activeSat = useMemo(() => satellites.find((s) => s.active), [satellites]);
  const mainGW = gateways[0];

  const links = useMemo(() => {
    if (!activeSat) return [];
    return [
      {
        id: "LINK-GW-MAIN-ACTIVE",
        from: { lat: mainGW.lat, lng: mainGW.lng, heightM: 0 },
        to: { lat: activeSat.lat, lng: activeSat.lng, heightM: activeSat.altitudeM },
      },
    ];
  }, [activeSat, mainGW.lat, mainGW.lng]);

  const satFootprints = useMemo(() => {
    if (!activeSat) return [];

    // footprint demo: half-angle ~20° (có thể chỉnh sau nếu cần)
    const radiusM = calcFootprintRadiusM(activeSat.altitudeM, 20);
    return [
      {
        id: `FP-${activeSat.id}`,
        lat: activeSat.lat,
        lng: activeSat.lng,
        radiusM,
      },
    ];
  }, [activeSat]);

  const antennaBeams = useMemo(() => {
    // Cone 3D demo bằng CylinderGraphics (topRadius=0) - hướng theo local up
    // Nếu máy/GPU yếu, đây vẫn là primitive nhẹ.
    const lengthM = 300_000;

    return antennaPoints.map((a) => {
      const halfAngle = (a.beamAngleDeg ?? 30) / 2;
      const bottomRadius = calcFootprintRadiusM(lengthM, halfAngle);
      return {
        id: `BEAM-${a.id}`,
        position: { lat: a.lat, lng: a.lng, heightM: lengthM / 2 },
        lengthM,
        bottomRadius,
        topRadius: 0,
      };
    });
  }, [antennaPoints]);

  // OSM imagery để tránh Cesium Ion token
  const imageryProvider = useMemo(() => new OpenStreetMapImageryProvider(), []);

  // Core-only terrain (không dùng Cesium ion terrain)
  const terrainProvider = useMemo(() => new EllipsoidTerrainProvider(), []);

  // Set initial camera ONCE (tránh flyTo/zoomTo bị gọi lại theo tick/render)
  useEffect(() => {
    if (hasSetInitialCamera.current) return;

    let raf = 0;
    const trySet = () => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) {
        raf = requestAnimationFrame(trySet);
        return;
      }

      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(108, 16, 12_000_000),
        orientation: {
          heading: 0,
          pitch: -CesiumMath.PI_OVER_TWO,
          roll: 0,
        },
      });

      hasSetInitialCamera.current = true;
    };

    raf = requestAnimationFrame(trySet);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Giữ nguyên wrapper sizing giống NetworkGlobe: full + min-height
  return (
    <div className="relative h-full w-full min-h-[500px] flex justify-center items-center overflow-hidden bg-slate-950">
      <Viewer
        ref={viewerRef}
        imageryProvider={imageryProvider}
        terrainProvider={terrainProvider}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        animation={false}
        timeline={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
        shouldAnimate={true}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Nodes: Gateways */}
        {gatewayPoints.map((gw) => (
          <Entity key={gw.id} name={gw.id} position={toCartesian({ lat: gw.lat, lng: gw.lng, heightM: 0 })}>
            <PointGraphics pixelSize={gw.size} color={gw.color} outlineColor={Color.BLACK} outlineWidth={1} />
          </Entity>
        ))}

        {/* Nodes: Routers */}
        {routerPoints.map((rt) => (
          <Entity key={rt.id} name={rt.id} position={toCartesian({ lat: rt.lat, lng: rt.lng, heightM: 0 })}>
            <PointGraphics pixelSize={rt.size} color={rt.color} outlineColor={Color.BLACK} outlineWidth={1} />
          </Entity>
        ))}

        {/* Nodes: Antennas */}
        {antennaPoints.map((a) => (
          <Entity key={a.id} name={a.id} position={toCartesian({ lat: a.lat, lng: a.lng, heightM: 0 })}>
            <PointGraphics pixelSize={a.size} color={a.color} outlineColor={Color.BLACK} outlineWidth={1} />
          </Entity>
        ))}

        {/* Satellites */}
        {satellites.map((sat) => (
          <Entity
            key={sat.id}
            name={sat.id}
            position={toCartesian({ lat: sat.lat, lng: sat.lng, heightM: sat.altitudeM })}
          >
            <PointGraphics
              pixelSize={sat.size}
              color={sat.color}
              outlineColor={sat.active ? Color.WHITE : Color.BLACK}
              outlineWidth={sat.active ? 2 : 1}
            />
          </Entity>
        ))}

        {/* Links */}
        {links.map((l) => (
          <Entity key={l.id} name={l.id}>
            <PolylineGraphics
              positions={[toCartesian(l.from), toCartesian(l.to)]}
              width={2.5}
              material={new PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Color.fromCssColorString("#22c55e"),
              })}
            />
            <PolylineGraphics
              positions={[toCartesian(l.from), toCartesian(l.to)]}
              width={1.5}
              material={new PolylineDashMaterialProperty({
                color: Color.fromCssColorString("#00ff88"),
                dashLength: 16,
              })}
            />
          </Entity>
        ))}

        {/* Satellite footprint (vùng phủ) */}
        {satFootprints.map((fp) => (
          <Entity key={fp.id} name={fp.id} position={toCartesian({ lat: fp.lat, lng: fp.lng, heightM: 0 })}>
            <EllipseGraphics
              semiMajorAxis={fp.radiusM}
              semiMinorAxis={fp.radiusM}
              height={0}
              material={Color.fromCssColorString("#22c55e").withAlpha(0.12)}
              outline={true}
              outlineColor={Color.fromCssColorString("#22c55e").withAlpha(0.35)}
            />
          </Entity>
        ))}

        {/* Antenna beam (cone 30° demo) */}
        {antennaBeams.map((b) => (
          <Entity
            key={b.id}
            name={b.id}
            position={toCartesian({
              lat: b.position.lat,
              lng: b.position.lng,
              heightM: b.position.heightM,
            })}
          >
            <CylinderGraphics
              length={b.lengthM}
              topRadius={b.topRadius}
              bottomRadius={b.bottomRadius}
              material={Color.fromCssColorString("#0ea5e9").withAlpha(0.12)}
              outline={true}
              outlineColor={Color.fromCssColorString("#0ea5e9").withAlpha(0.25)}
            />
          </Entity>
        ))}
      </Viewer>

      {/* Overlay chú thích giữ nguyên giống NetworkGlobe */}
      <div className="absolute top-4 left-4 p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 text-[10px] text-white backdrop-blur-md pointer-events-none">
        <h4 className="font-black text-cyan-400 mb-3 uppercase tracking-tighter">Live Orbital View</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22ff22] shadow-[0_0_12px_#22ff22] animate-pulse" />
            <span className="font-bold text-slate-100 uppercase tracking-tight">Satellite (🟢)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
            <span className="text-slate-200">Gateway (🔵)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#fde047]" />
            <span className="text-slate-200">Router (🟡)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
            <span className="text-slate-200">Antenna / Beam (🔷)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_5px_#ef4444]" />
            <span className="text-slate-200">Critical Alert (Satellite lỗi)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
