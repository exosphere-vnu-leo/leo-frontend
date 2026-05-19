import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Viewer, Entity } from 'resium'
import { Cartesian3, Color, Math as CesiumMath, CallbackProperty } from 'cesium'
import { detectHandovers, getLatestHandover, getActiveLinkState } from '../utils/handoverUtils'

// Demo gateway coordinates (Hanoi, Danang, HCMC)
const GATEWAYS = [
  { id: 'GW-HANOI', lat: 21.0285, lon: 105.8542, label: 'Hanoi' },
  { id: 'GW-DANANG', lat: 16.0544, lon: 108.2022, label: 'Danang' },
  { id: 'GW-HOCHIMINH', lat: 10.8231, lon: 106.6297, label: 'Ho Chi Minh' },
]

function latLonToCartesian(lat, lon, heightM = 0) {
  return Cartesian3.fromDegrees(lon, lat, heightM)
}

function makeSatellitesFromRows(rows) {
  const sats = new Map()
  const arr = Array.isArray(rows) ? rows : []
  arr.forEach((r, i) => {
    const id = String(r.sat_id ?? `SAT-${i}`).trim()
    if (!sats.has(id)) {
      sats.set(id, {
        id,
        phase: (i * 37) % 360,
        orbit: i % 3,
        lastRow: r,
      })
    } else {
      sats.get(id).lastRow = r
    }
  })
  // fallback demo satellites if none
  if (sats.size === 0) {
    for (let i = 0; i < 6; i++) {
      sats.set(`SAT-${i}`, { id: `SAT-${i}`, phase: (i * 60) % 360, orbit: i % 3, lastRow: null })
    }
  }
  return Array.from(sats.values())
}

export default function NetworkCesium({ data, currentSatId, selectedHandover = null, playbackRows = null, isPlayback = false, currentTime = null, trackActiveHandover = false }) {
  const viewerRef = useRef(null)
  const [tick, setTick] = useState(0)
  const [autoRotate, setAutoRotate] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const [trackHandoverEnabled, setTrackHandoverEnabled] = useState(false)
  const pulseCount = 3

  const rows = Array.isArray(playbackRows) ? playbackRows : (data?.gatewayRows ?? data?.rows ?? [])
  const satellites = useMemo(() => makeSatellitesFromRows(rows), [rows])
  const activeLinkMap = useMemo(() => getActiveLinkState(rows), [rows])
  const handovers = useMemo(() => detectHandovers(rows), [rows])
  const latestHandover = useMemo(() => getLatestHandover(rows), [rows])

  // local animation state for currently-visible handover
  const [handoverAnim, setHandoverAnim] = useState(null)

  useEffect(() => {
    let raf = null
    const loop = () => {
      setTick((t) => (t + 0.005) % (Math.PI * 2))
      // optional auto-rotate (cheap)
      if (autoRotate) {
        try {
          const cam = viewerRef.current?.cesiumElement?.camera
          if (cam) cam.rotateRight(CesiumMath.toRadians(0.02))
        } catch (e) {}
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // compute dynamic position for a satellite id
  function satPositionCartographic(sat, t) {
    // simple circular orbit approximation
    const phase = ((sat.phase || 0) + t * 360) % 360
    const angle = CesiumMath.toRadians(phase)
    const orbitLatOffset = [-30, 0, 30][sat.orbit % 3] || 0
    const lat = Math.sin(angle) * 45 + orbitLatOffset
    const lon = ((phase * 1.5 + (sat.orbit || 0) * 120) % 360) - 180
    const alt = (sat.lastRow && Number(sat.lastRow.alt_km)) ? Number(sat.lastRow.alt_km) * 1000 : 360000 // meters
    return Cartesian3.fromDegrees(lon, lat, alt)
  }

  const entities = useMemo(() => {
    const t = tick * 60 // speed factor
    return satellites.map((sat) => {
      const position = new CallbackProperty(() => satPositionCartographic(sat, t), false)
      const sinr = sat.lastRow ? Number(sat.lastRow.sinr_db) : null
      const quality = sinr === null || Number.isNaN(sinr) ? 0 : Math.max(0, Math.min(1, (sinr + 10) / 30))
      const color = sinr === null ? Color.GRAY : quality < 0.25 ? Color.RED : quality < 0.5 ? Color.ORANGE : Color.GREEN

      // footprint radius meters (approx) scaled by quality and altitude
      const altM = (sat.lastRow && Number(sat.lastRow.alt_km)) ? Number(sat.lastRow.alt_km) * 1000 : 360000
      const baseRadius = Math.max(100000, 300000 + (1 - quality) * 1200000)
      // use stable numeric semi-axes to avoid geometry updater errors
      const semiMajor = Math.max(100, Math.round(baseRadius))
      const semiMinor = Math.max(100, Math.round(baseRadius * 0.98))
      return {
        id: sat.id,
        position,
        label: {
          text: sat.id + (sat.lastRow && sat.lastRow.beam_id ? ` • B${sat.lastRow.beam_id}` : ''),
          font: '14px monospace',
          fillColor: Color.WHITE,
          style: 'FILL_AND_OUTLINE',
          outlineWidth: 2,
          pixelOffset: { x: 0, y: -30 },
        },
        billboard: {
          image: undefined,
          scale: 0.8,
          color,
        },
        ellipse: {
          semiMajorAxis: semiMajor,
          semiMinorAxis: semiMinor,
          height: 0,
          material: Color.fromBytes(34, 197, 238, 40),
        },
        sinr,
        lastRow: sat.lastRow,
      }
    })
  }, [satellites, tick])

  // Trigger handover animations when a new handover appears
  useEffect(() => {
    if (!latestHandover) return
    // ignore if same as current animation
    if (handoverAnim && handoverAnim.event && handoverAnim.event.time_s === latestHandover.time_s) return
    const start = performance.now()
    const duration = 4200 // ms
    setHandoverAnim({ event: latestHandover, start, duration, finished: false })
    const to = setTimeout(() => setHandoverAnim((s) => s ? { ...s, finished: true } : null), duration)
    return () => clearTimeout(to)
  }, [latestHandover])

  // Respond to selectedHandover prop (focus & highlight)
  useEffect(() => {
    if (!selectedHandover) return
    const newSatId = `SAT-${selectedHandover.new_sat_id}`
    const sat = entities.find((e) => e.id === newSatId)
    if (!sat) return
    const cam = viewerRef.current?.cesiumElement?.camera
    if (!cam) return
    const pos = sat.position.getValue()
    cam.flyTo({ destination: Cartesian3.add(pos, Cartesian3.multiplyByScalar(Cartesian3.normalize(pos), 1.0, new Cartesian3()), new Cartesian3()), duration: 1.2 })
    // set a temporary label by setting handoverAnim-like object
    setHandoverAnim({ event: selectedHandover, start: performance.now(), duration: 2200, finished: false })
    const to = setTimeout(() => setHandoverAnim((s) => s ? { ...s, finished: true } : null), 2200)
    return () => clearTimeout(to)
  }, [selectedHandover])

  useEffect(() => {
    if (!(trackActiveHandover || trackHandoverEnabled) || !handoverAnim?.event) return
    const newSatId = `SAT-${handoverAnim.event.new_sat_id}`
    const sat = entities.find((e) => e.id === newSatId)
    if (!sat) return
    const cam = viewerRef.current?.cesiumElement?.camera
    if (!cam) return
    const pos = sat.position.getValue()
    cam.flyTo({ destination: Cartesian3.add(pos, Cartesian3.multiplyByScalar(Cartesian3.normalize(pos), 1.0, new Cartesian3()), new Cartesian3()), duration: 0.8 })
  }, [trackActiveHandover, trackHandoverEnabled, handoverAnim, entities])

  // camera helpers
  function focusVietnam() {
    const cam = viewerRef.current?.cesiumElement?.camera
    if (!cam) return
    cam.flyTo({ destination: Cartesian3.fromDegrees(106.0, 16.0, 2000000), duration: 1.6 })
  }

  function focusActiveSatellite() {
    const sat = entities.find((e) => e.id === currentSatId) || entities[0]
    if (!sat) return
    const cam = viewerRef.current?.cesiumElement?.camera
    if (!cam) return
    const pos = sat.position.getValue()
    cam.flyTo({ destination: Cartesian3.add(pos, Cartesian3.multiplyByScalar(Cartesian3.normalize(pos), 1.0, new Cartesian3()), new Cartesian3()), duration: 1.2 })
  }

  function resetCamera() {
    const cam = viewerRef.current?.cesiumElement?.camera
    if (!cam) return
    cam.flyTo({ destination: Cartesian3.fromDegrees(108.0, 14.0, 2200000), duration: 1.6 })
  }

  return (
    <div className="relative h-full w-full min-h-125 rounded-xl overflow-hidden bg-slate-900">
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        requestRenderMode={true}
        maximumRenderTimeChange={16}
        imageryProvider={undefined}
        terrainProvider={undefined}
        className="cesium-viewer"
      >
        {/* Earth visual — built-in globe with lighting */}
        {entities.map((ent) => (
          <Entity
            key={ent.id}
            name={ent.id}
            position={ent.position}
            label={ent.label}
            billboard={{ image: undefined, scale: 1.0 }}
            ellipse={{
              semiMajorAxis: ent.ellipse.semiMajorAxis,
              semiMinorAxis: ent.ellipse.semiMinorAxis,
              material: Color.fromBytes(34, 197, 238, 40),
              heightReference: 1,
            }}
          />
        ))}

        {/* Gateways and dynamic beams */}
        {GATEWAYS.map((gw, gi) => {
          const gwPos = latLonToCartesian(gw.lat, gw.lon, 0)
          const latestForNode = activeLinkMap.get(gi + 1) // map node_id -> gateway index (estimated)
          // If CSV provides explicit gateway node_id mapping, we use it; otherwise, treat as estimated
          const latestSatId = latestForNode ? String(latestForNode.sat_id) : null
          const activeSatEntity = entities.find((s) => s.id === (latestSatId ? `SAT-${latestSatId}` : currentSatId)) || entities[0]

          // Beam positions callback
          const beamPositions = new CallbackProperty(() => {
            const satPos = activeSatEntity.position.getValue()
            return [gwPos, satPos]
          }, false)

          // Determine SINR and quality from activeLinkMap entry (fallback to sat.lastRow)
          const sinr = latestForNode ? Number(latestForNode.sinr_db) : (activeSatEntity.lastRow ? Number(activeSatEntity.lastRow.sinr_db) : null)
          const quality = sinr === null || Number.isNaN(sinr) ? 0 : Math.max(0, Math.min(1, (sinr + 10) / 30))
          const beamColor = sinr === null ? Color.RED : sinr >= 20 ? Color.GREEN : sinr >= 10 ? Color.YELLOW : Color.RED
          const beamWidth = 1 + Math.round(1 + quality * 6)

          // If no valid satellite, show red marker and label NO LINK
          const noLink = !latestForNode || (Number(latestForNode.sat_id) === -1)

          // prepare pulses for this beam
          const pulses = []
          if (!noLink) {
            for (let p = 0; p < pulseCount; p++) {
              const offset = p / pulseCount
              const period = 1600 + p * 220
              const pulsePos = new CallbackProperty(() => {
                // progress 0..1 along beam
                const tms = performance.now()
                const frac = ((tms % period) / period + offset) % 1
                const a = gwPos
                const b = activeSatEntity.position.getValue()
                const out = new Cartesian3()
                return Cartesian3.lerp(a, b, frac, out)
              }, false)
              pulses.push({ id: `pulse-${gw.id}-${p}`, position: pulsePos, color: beamColor })
            }
          }

          return (
            <React.Fragment key={`gw-block-${gw.id}`}>
              <Entity
                name={gw.id}
                position={gwPos}
                point={{ pixelSize: 10, color: noLink ? Color.RED : Color.CYAN }}
                label={{ text: noLink ? `${gw.label} • NO LINK` : gw.label, font: '12px monospace', fillColor: Color.WHITE, pixelOffset: { x: 0, y: -20 } }}
              />

              {!noLink && (
                <>
                  <Entity
                    key={`beam-${gw.id}`}
                    polyline={{ positions: beamPositions, width: beamWidth, material: beamColor }}
                  />
                  {/* pulse billboards */}
                  {pulses.map((pp) => (
                    <Entity key={pp.id} position={pp.position} billboard={{ image: undefined, scale: 0.6, color: pp.color }} />
                  ))}
                </>
              )}
            </React.Fragment>
          )
        })}

        {/* Handover visualization (animated) */}
        {handoverAnim && handoverAnim.event && !handoverAnim.finished && (() => {
          const ev = handoverAnim.event
          const progress = () => {
            const now = performance.now()
            const p = Math.min(1, (now - handoverAnim.start) / handoverAnim.duration)
            return p
          }

          const oldSat = entities.find((s) => s.id === `SAT-${ev.old_sat_id}`)
          const newSat = entities.find((s) => s.id === `SAT-${ev.new_sat_id}`)
          if (!oldSat || !newSat) return null

          const oldPosCb = new CallbackProperty(() => oldSat.position.getValue(), false)
          const newPosCb = new CallbackProperty(() => newSat.position.getValue(), false)

          // dashed transition arc (simulate by a fading polyline)
          const arcPositions = new CallbackProperty(() => {
            const a = oldSat.position.getValue()
            const b = newSat.position.getValue()
            return [a, b]
          }, false)

          // material color callbacks
          const oldMat = new CallbackProperty(() => {
            const p = progress()
            const alpha = Math.max(0, 1 - p * 1.1)
            return Color.fromBytes(255, 165, 0, Math.round(alpha * 255))
          }, false)
          const newMat = new CallbackProperty(() => {
            const p = progress()
            const alpha = Math.min(1, p * 1.2)
            return Color.fromBytes(34, 197, 94, Math.round(alpha * 255))
          }, false)

          return (
            <React.Fragment key={`handover-${ev.node_id}-${ev.time_s}`}>
              <Entity polyline={{ positions: oldPosCb, width: 4, material: oldMat }} />
              <Entity polyline={{ positions: newPosCb, width: 4, material: newMat }} />
              <Entity polyline={{ positions: arcPositions, width: 2, material: Color.YELLOW }} />
              <Entity position={newPosCb} label={{ text: 'HANDOVER IN PROGRESS', font: '16px monospace', fillColor: Color.YELLOW, pixelOffset: { x: 0, y: -50 } }} />
            </React.Fragment>
          )
        })()}
      </Viewer>

      {/* Controls overlay */}
      <div className="absolute top-3 left-3 z-20">
        <div className="bg-slate-900/75 border border-slate-700 p-2 rounded-md text-slate-100 text-sm space-y-2">
          <div className="flex gap-2">
            <button onClick={focusVietnam} className="px-2 py-1 bg-indigo-600/80 rounded text-white text-xs">Focus Vietnam</button>
            <button onClick={focusActiveSatellite} className="px-2 py-1 bg-cyan-600/80 rounded text-white text-xs">Focus Satellite</button>
            <button onClick={resetCamera} className="px-2 py-1 bg-slate-700/80 rounded text-white text-xs">Reset</button>
            <button onClick={() => { setFocusIndex((i) => (i + 1) % Math.max(1, entities.length)); const s = entities[(focusIndex + 1) % Math.max(1, entities.length)]; if (s) { const cam = viewerRef.current?.cesiumElement?.camera; const pos = s.position.getValue(); cam && cam.flyTo({ destination: Cartesian3.add(pos, Cartesian3.multiplyByScalar(Cartesian3.normalize(pos), 1.0, new Cartesian3()), new Cartesian3()), duration: 1.0 }) } }} className="px-2 py-1 bg-violet-600/80 rounded text-white text-xs">Focus Next</button>
            <button onClick={() => setAutoRotate((v) => !v)} className={`px-2 py-1 rounded text-white text-xs ${autoRotate ? 'bg-emerald-600/80' : 'bg-slate-700/80'}`}>{autoRotate ? 'Auto Rotate: On' : 'Auto Rotate'}</button>
            <button onClick={() => setTrackHandoverEnabled((v) => !v)} className={`px-2 py-1 rounded text-white text-xs ${trackHandoverEnabled ? 'bg-amber-600/80' : 'bg-slate-700/80'}`}>Track Handover</button>
          </div>
          <div className="text-xs text-slate-300">Satellites: {entities.length}</div>
          <div className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.3em] ${isPlayback ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-slate-700/50 text-slate-300 border border-slate-600'}`}>
            {isPlayback ? 'Playback Mode' : 'Live / Latest Mode'}
          </div>
          {currentTime !== null && (
            <div className="text-[10px] text-slate-400 font-mono">time_s = {Number(currentTime).toFixed(1)}</div>
          )}
        </div>
      </div>

      {/* Mini telemetry overlay */}
      <div className="absolute top-3 right-3 z-20">
        <div className="bg-slate-900/75 border border-slate-700 p-2 rounded-md text-slate-100 text-sm">
          <div className="text-[11px] font-bold">Telemetry</div>
          <div className="mt-1 text-xs text-slate-300">Active Links: {Array.from(activeLinkMap.values()).filter(r => Number(r.sat_id) >= 0).length}</div>
          <div className="text-xs text-slate-300">Weak Signals: {Array.from(activeLinkMap.values()).filter(r => { const s = Number(r.sinr_db); return Number.isFinite(s) && s < 10 }).length}</div>
          <div className="text-xs text-slate-300">Disconnected: {Array.from(activeLinkMap.values()).filter(r => Number(r.sat_id) === -1).length}</div>
          <div className="mt-2 text-xs text-amber-300">Current Handover: {handoverAnim?.event ? `Node ${handoverAnim.event.node_id} @ ${handoverAnim.event.time_s}` : (handovers.length ? `Node ${handovers.at(-1).node_id} @ ${handovers.at(-1).time_s}` : 'None')}</div>
        </div>
      </div>
      {/* Estimated-data badge */}
      {(!rows || rows.length === 0) && (
        <div className="absolute top-3 right-3 z-20">
          <div className="bg-amber-900/80 border border-amber-700 p-2 rounded-md text-amber-100 text-xs font-bold">Estimated orbital visualization</div>
        </div>
      )}
    </div>
  )
}
