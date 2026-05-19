import { useEffect, useMemo, useRef, useState } from "react";
import {
  CallbackProperty,
  Cartesian3,
  Color,
  EllipsoidTerrainProvider,
  Matrix3,
  Math as CesiumMath,
  OpenStreetMapImageryProvider,
  PolylineDashMaterialProperty,
  PolylineGlowMaterialProperty,
  Quaternion,
} from "cesium";
import {
  CylinderGraphics,
  EllipseGraphics,
  Entity,
  PointGraphics,
  PolylineGraphics,
  Viewer,
} from "resium";

type SatelliteStatus = "Alive" | "Dead" | "Warning";

type LatLng = {
  lat: number;
  lng: number;
};

type SatelliteMock = {
  id: string;
  orbit: number;
  phase: number;
  dead?: boolean;
  status?: SatelliteStatus;

  // Bổ sung tối thiểu (để dễ mở rộng sau này)
  altitudeKm?: number;
  orbitSpeed?: number; // deg/second
  coverageRadiusKm?: number;
};

type AntennaMock = {
  id: string;
  lat: number;
  lng: number;
  beamAngleDeg: number;
};

type Props = {
  currentSatId?: string;
};

// Mock data giữ nguyên tinh thần từ NetworkGlobe (bổ sung field tối thiểu nếu cần)
const gateways = [
  { id: "GW-HANOI", lat: 21.0285, lng: 105.8542, label: "Main Station" },
  { id: "GW-DANANG", lat: 16.0544, lng: 108.2022, label: "Relay Node" },
  { id: "GW-HOCHIMINH", lat: 10.8231, lng: 106.6297, label: "Southern Hub" },
  { id: "GW-HAIPHONG", lat: 20.8449, lng: 106.6881, label: "Backup GW" },
  { id: "GW-CANTHO", lat: 10.0452, lng: 105.7469, label: "Remote GW" },
];

const routers = [
  { id: "RT-01", lat: 18.5, lng: 105.5, label: "Router 1" },
  { id: "RT-02", lat: 14.5, lng: 109.0, label: "Router 2" },
  { id: "RT-03", lat: 12.0, lng: 108.0, label: "Router 3" },
  { id: "RT-04", lat: 22.0, lng: 100.0, label: "Router 4" },
  { id: "RT-05", lat: 8.0, lng: 104.0, label: "Router 5" },
];

const antennas: AntennaMock[] = [
  {
    id: "ANT-GW-HANOI",
    lat: gateways[0].lat,
    lng: gateways[0].lng,
    beamAngleDeg: 30,
  },
];

const NUM_SAT = 18;
const initialSatellites: SatelliteMock[] = Array.from({ length: NUM_SAT }, (_, i) => {
  const dead = i === 5;
  const warning = i === 8;
  return {
    id: `SAT-${1000 + i}`,
    orbit: i % 3,
    phase: (i * 360) / NUM_SAT,
    dead,
    status: dead ? "Dead" : warning ? "Warning" : "Alive",

    altitudeKm: 550, // LEO demo
    orbitSpeed: 14, // deg/s (demo)
    // coverageRadiusKm: để undefined -> tính từ altitude + angle
  };
});

function orbitToPosition(orbit: number, phaseDeg: number): LatLng {
  const angle = CesiumMath.toRadians(phaseDeg);
  const orbitLatOffset = [-30, 0, 30][orbit % 3];
  const lat = Math.sin(angle) * 45 + orbitLatOffset;
  const lng = ((phaseDeg * 1.5 + orbit * 120) % 360) - 180;
  return { lat, lng };
}

function orbitPathPositions(orbit: number, altitudeM: number, segments = 160) {
  const pts: Cartesian3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const phase = (i / segments) * 360;
    const p = orbitToPosition(orbit, phase);
    pts.push(toCartesian({ lat: p.lat, lng: p.lng, heightM: altitudeM }));
  }
  return pts;
}

function toCartesian({ lat, lng, heightM = 0 }: { lat: number; lng: number; heightM?: number }) {
  return Cartesian3.fromDegrees(lng, lat, heightM);
}

function calcRadiusFromAltitudeM(altitudeM: number, halfAngleDeg: number) {
  const halfAngleRad = CesiumMath.toRadians(halfAngleDeg);
  return Math.max(1, altitudeM * Math.tan(halfAngleRad));
}

function satColor(status: SatelliteStatus) {
  if (status === "Dead") return Color.fromCssColorString("#ef4444");
  if (status === "Warning") return Color.fromCssColorString("#fde047");
  return Color.fromCssColorString("#22ff22");
}

function orbitColor(status: SatelliteStatus, isActive: boolean) {
  if (isActive) return Color.fromCssColorString("#22d3ee").withAlpha(0.55); // cyan
  if (status === "Warning") return Color.fromCssColorString("#fde047").withAlpha(0.40);
  if (status === "Dead") return Color.fromCssColorString("#ef4444").withAlpha(0.18);
  return Color.fromCssColorString("#94a3b8").withAlpha(0.12); // neutral faint
}

function orbitMaterial(status: SatelliteStatus, isActive: boolean) {
  const c = orbitColor(status, isActive);
  const glowPower = isActive ? 0.22 : status === "Warning" ? 0.16 : 0.12;
  return new PolylineGlowMaterialProperty({ glowPower, color: c });
}

function coverageMaterial(status: SatelliteStatus, isActive: boolean) {
  // Active: xanh dương/xanh lá trong suốt rõ hơn
  if (isActive) return Color.fromCssColorString("#22c55e").withAlpha(0.10);
  if (status === "Warning") return Color.fromCssColorString("#fde047").withAlpha(0.06);
  // Dead: theo yêu cầu "mờ hoặc biến mất" -> biến mất (không render)
  return Color.fromCssColorString("#22c55e").withAlpha(0.035);
}

function coverageOutline(status: SatelliteStatus, isActive: boolean) {
  if (isActive) return Color.fromCssColorString("#22c55e").withAlpha(0.30);
  if (status === "Warning") return Color.fromCssColorString("#fde047").withAlpha(0.22);
  return Color.fromCssColorString("#22c55e").withAlpha(0.14);
}

export default function CesiumTopologyView({ currentSatId = "SAT-0123" }: Props) {
  const viewerRef = useRef<any>(null);
  const hasSetInitialCamera = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const animate = () => {
      setTick((t) => t + 0.02);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

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

      // --- Visual tuning (run once): dark NOC + subtle realism ---
      // Keep OSM as base layer but dim/soften so it reads like monitoring texture.
      const baseLayer = viewer.imageryLayers?.get?.(0);
      if (baseLayer) {
        baseLayer.alpha = 0.38;
        baseLayer.brightness = 0.70;
        baseLayer.contrast = 1.05;
        baseLayer.saturation = 0.55;
        baseLayer.gamma = 1.10;
      }

      const scene = viewer.scene;
      scene.backgroundColor = Color.fromCssColorString("#020617");

      // Star background (default skybox) + subtle atmosphere glow
      if (scene.skyBox) scene.skyBox.show = true;
      const skyAtmosphere: any = scene.skyAtmosphere as any;
      if (skyAtmosphere) {
        skyAtmosphere.show = true;
        skyAtmosphere.hueShift = -0.10;
        skyAtmosphere.saturationShift = 0.15;
        skyAtmosphere.brightnessShift = -0.05;
      }

      // Avoid bright celestial glare (still keep starfield)
      if (scene.sun) scene.sun.show = false;
      if (scene.moon) scene.moon.show = false;

      const globe: any = scene.globe as any;
      if (globe) {
        globe.baseColor = Color.fromCssColorString("#081426");
        globe.showGroundAtmosphere = true;
        globe.enableLighting = true;

        // These exist on newer Cesium; guard to avoid runtime issues.
        if (typeof globe.atmosphereHueShift === "number") globe.atmosphereHueShift = -0.10;
        if (typeof globe.atmosphereSaturationShift === "number") globe.atmosphereSaturationShift = 0.25;
        if (typeof globe.atmosphereBrightnessShift === "number") globe.atmosphereBrightnessShift = -0.05;
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

  const satellites = useMemo(() => {
    return initialSatellites.map((sat) => {
      // Di chuyển chậm để giống monitoring thực tế hơn
      const speed = sat.orbitSpeed ?? 1.6;
      const phase = sat.phase + tick * speed;
      const pos = orbitToPosition(sat.orbit, phase);
      const isActive = sat.id === currentSatId;

      const altitudeM = ((sat.altitudeKm ?? 550) + (isActive ? 60 : 0)) * 1000;
      const status: SatelliteStatus = sat.status ?? (sat.dead ? "Dead" : "Alive");

      return {
        ...sat,
        ...pos,
        altitudeM,
        isActive,
        status,
      };
    });
  }, [tick, currentSatId]);

  // Orbit paths: line mờ quanh Trái Đất (màu theo active/warning/dead)
  const orbitPaths = useMemo(() => {
    return initialSatellites.map((sat) => {
      const isActive = sat.id === currentSatId;
      const status: SatelliteStatus = sat.status ?? (sat.dead ? "Dead" : "Alive");
      const altitudeM = ((sat.altitudeKm ?? 550) + (isActive ? 60 : 0)) * 1000;

      return {
        id: `ORBIT-${sat.id}`,
        positions: orbitPathPositions(sat.orbit, altitudeM, 180),
        material: orbitMaterial(status, isActive),
        width: isActive ? 2.6 : status === "Warning" ? 2.1 : 1.7,
      };
    });
  }, [currentSatId]);

  const activeSat = useMemo(() => satellites.find((s) => s.isActive), [satellites]);
  const mainGW = gateways[0];

  // Active link animation nhẹ: pulse alpha theo tick
  const animatedLinkMaterial = useMemo(() => {
    return new CallbackProperty(() => {
      const base = Color.fromCssColorString("#22c55e");
      const a = 0.25 + 0.20 * Math.abs(Math.sin(tick * 2.2));
      return new PolylineGlowMaterialProperty({ glowPower: 0.18, color: base.withAlpha(a) });
    }, false);
  }, [tick]);

  const link = useMemo(() => {
    if (!activeSat) return null;
    return {
      id: "LINK-GW-MAIN-ACTIVE",
      from: { lat: mainGW.lat, lng: mainGW.lng, heightM: 0 },
      to: { lat: activeSat.lat, lng: activeSat.lng, heightM: activeSat.altitudeM },
    };
  }, [activeSat, mainGW.lat, mainGW.lng]);

  const footprint = useMemo(() => {
    if (!activeSat) return null;

    // Nếu mock có coverageRadiusKm thì dùng luôn, nếu không thì ước lượng từ altitude + beam half-angle
    const radiusM =
      typeof activeSat.coverageRadiusKm === "number"
        ? Math.max(1, activeSat.coverageRadiusKm * 1000)
        : calcRadiusFromAltitudeM(activeSat.altitudeM, 30);

    return {
      id: `FP-${activeSat.id}`,
      lat: activeSat.lat,
      lng: activeSat.lng,
      radiusM,
    };
  }, [activeSat]);

  const coverageFootprints = useMemo(() => {
    // Coverage radius phụ thuộc altitude: dùng coverageRadiusKm nếu có, fallback theo altitude + half-angle
    // Dead satellite: không vẽ
    return satellites
      .filter((s) => s.status !== "Dead")
      .map((s) => {
        const radiusM =
          typeof s.coverageRadiusKm === "number"
            ? Math.max(1, s.coverageRadiusKm * 1000)
            : calcRadiusFromAltitudeM(s.altitudeM, 30);

        return {
          id: `CVG-${s.id}`,
          lat: s.lat,
          lng: s.lng,
          radiusM,
          isActive: s.isActive,
          status: s.status,
        };
      });
  }, [satellites]);

  const antennaBeam = useMemo(() => {
    if (!activeSat) return null;

    const antenna = antennas[0];
    // Yêu cầu: half-angle ~30 độ. Reuse field beamAngleDeg như half-angle để giữ mock tối thiểu.
    // Always use 30° half-angle for beam
    const halfAngleDeg = 30;

    // Tính cone hướng đúng lên vệ tinh active
    const from = toCartesian({ lat: antenna.lat, lng: antenna.lng, heightM: 0 });
    const to = toCartesian({ lat: activeSat.lat, lng: activeSat.lng, heightM: activeSat.altitudeM });
    const dir = Cartesian3.subtract(to, from, new Cartesian3());
    const lengthM = Cartesian3.magnitude(dir);
    if (!Number.isFinite(lengthM) || lengthM <= 1) return null;

    const zAxis = Cartesian3.normalize(dir, new Cartesian3());
    // Dùng vector "up" theo bán kính Trái Đất tại midpoint để ổn định
    const mid = Cartesian3.midpoint(from, to, new Cartesian3());
    let up = Cartesian3.normalize(mid, new Cartesian3());
    if (Math.abs(Cartesian3.dot(zAxis, up)) > 0.98) {
      up = Cartesian3.UNIT_X;
    }

    let xAxis = Cartesian3.cross(up, zAxis, new Cartesian3());
    if (Cartesian3.magnitudeSquared(xAxis) < 1e-8) {
      xAxis = Cartesian3.cross(Cartesian3.UNIT_Y, zAxis, xAxis);
    }
    xAxis = Cartesian3.normalize(xAxis, xAxis);
    const yAxis = Cartesian3.normalize(Cartesian3.cross(zAxis, xAxis, new Cartesian3()), new Cartesian3());

    const rot = Matrix3.fromColumns(xAxis, yAxis, zAxis, new Matrix3());
    const orientation = Quaternion.fromRotationMatrix(rot, new Quaternion());

    const bottomRadius = calcRadiusFromAltitudeM(lengthM, halfAngleDeg);

    // Màu beam theo trạng thái uplink
    const status = activeSat.status;
    const isDisconnected = status === "Dead";
    if (isDisconnected) return null; // dead/disconnected: ẩn


    // Pulse animation for active beam (opacity cycles 0.08-0.18)
    let pulseAlpha = 0.10;
    if (status !== "Warning") {
      const t = Date.now() / 900;
      pulseAlpha = 0.13 + 0.05 * Math.sin(t);
    }
    const color =
      status === "Warning"
        ? Color.fromCssColorString("#fde047").withAlpha(0.10)
        : Color.fromCssColorString("#22d3ee").withAlpha(pulseAlpha);
    const outlineColor =
      status === "Warning"
        ? Color.fromCssColorString("#fde047").withAlpha(0.25)
        : Color.fromCssColorString("#22d3ee").withAlpha(0.25);

    return {
      id: `BEAM-${antenna.id}`,
      mid,
      orientation,
      lengthM,
      bottomRadius,
      topRadius: 0,
      halfAngleDeg,
      color,
      outlineColor,
    };
  }, [activeSat]);

  const imageryProvider = useMemo(() => new OpenStreetMapImageryProvider(), []);
  const terrainProvider = useMemo(() => new EllipsoidTerrainProvider(), []);

  return (
    <div className="absolute inset-0 min-h-0 overflow-hidden bg-slate-950">
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
        {/* Orbit paths */}
        {orbitPaths.map((o) => (
          <Entity key={o.id} name={o.id}>
            <PolylineGraphics positions={o.positions} width={o.width} material={o.material} />
          </Entity>
        ))}

        {/* Gateways */}
        {gateways.map((gw) => (
          <Entity key={gw.id} name={gw.id} position={toCartesian({ lat: gw.lat, lng: gw.lng })}>
            <PointGraphics pixelSize={8} color={Color.fromCssColorString("#2563eb")} outlineColor={Color.BLACK} outlineWidth={1} />
          </Entity>
        ))}

        {/* Routers */}
        {routers.map((rt) => (
          <Entity key={rt.id} name={rt.id} position={toCartesian({ lat: rt.lat, lng: rt.lng })}>
            <PointGraphics pixelSize={7} color={Color.fromCssColorString("#fde047")} outlineColor={Color.BLACK} outlineWidth={1} />
          </Entity>
        ))}

        {/* Antenna */}
        {antennas.map((a) => (
          <Entity key={a.id} name={a.id} position={toCartesian({ lat: a.lat, lng: a.lng })}>
            <PointGraphics pixelSize={9} color={Color.fromCssColorString("#0ea5e9")} outlineColor={Color.BLACK} outlineWidth={1} />
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
              pixelSize={sat.isActive ? 10 : 6}
              color={satColor(sat.status)}
              outlineColor={sat.isActive ? Color.WHITE : Color.BLACK}
              outlineWidth={sat.isActive ? 2 : 1}
            />
          </Entity>
        ))}

        {/* Active link GW <-> Sat */}
        {link && (
          <Entity name={link.id}>
            <PolylineGraphics positions={[toCartesian(link.from), toCartesian(link.to)]} width={2.8} material={animatedLinkMaterial as any} />
            <PolylineGraphics
              positions={[toCartesian(link.from), toCartesian(link.to)]}
              width={1.6}
              material={new PolylineDashMaterialProperty({
                color: Color.fromCssColorString("#00ff88").withAlpha(0.65),
                dashLength: 16,
              })}
            />
          </Entity>
        )}

        {/* Coverage footprint */}
        {footprint && (
          <Entity name={footprint.id} position={toCartesian({ lat: footprint.lat, lng: footprint.lng })}>
            <EllipseGraphics
              semiMajorAxis={footprint.radiusM}
              semiMinorAxis={footprint.radiusM}
              height={0}
              material={Color.fromCssColorString("#22c55e").withAlpha(0.08)}
              outline={true}
              outlineColor={Color.fromCssColorString("#22c55e").withAlpha(0.28)}
            />
          </Entity>
        )}

        {/* Coverage footprints (all satellites) */}
        {coverageFootprints.map((cv) => (
          <Entity key={cv.id} name={cv.id} position={toCartesian({ lat: cv.lat, lng: cv.lng })}>
            <EllipseGraphics
              semiMajorAxis={cv.radiusM}
              semiMinorAxis={cv.radiusM}
              height={0}
              material={coverageMaterial(cv.status, cv.isActive)}
              outline={true}
              outlineColor={coverageOutline(cv.status, cv.isActive)}
            />
          </Entity>
        ))}

        {/* Antenna beam cone (demo) */}
        {antennaBeam && (
          <Entity name={antennaBeam.id} position={antennaBeam.mid} orientation={antennaBeam.orientation}>
            <CylinderGraphics
              length={antennaBeam.lengthM}
              topRadius={antennaBeam.topRadius}
              bottomRadius={antennaBeam.bottomRadius}
              material={antennaBeam.color}
              outline={true}
              outlineColor={antennaBeam.outlineColor}
            />
          </Entity>
        )}
      </Viewer>

      {/* Overlay chú thích (giữ đúng layout hiện có) */}
      <div className="absolute top-4 left-4 p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 text-[10px] text-white backdrop-blur-md pointer-events-none">
        <h4 className="font-black text-cyan-400 mb-3 uppercase tracking-tighter">Live Orbital View</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22ff22] shadow-[0_0_12px_#22ff22] animate-pulse" />
            <span className="font-bold text-slate-100 uppercase tracking-tight">Satellite Alive (🟢)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#fde047]" />
            <span className="text-slate-200">Warning (🟡)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_5px_#ef4444]" />
            <span className="text-slate-200">Dead (🔴)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
            <span className="text-slate-200">Gateway (🔵)</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
            <span className="text-slate-200">Antenna Beam ({antennas[0].beamAngleDeg}°)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
