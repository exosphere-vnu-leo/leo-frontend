// Helper utilities to detect handovers and active link states from CSV rows
function toNumber(v) {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'nan') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function detectHandovers(rows = []) {
  // rows: array of CSV row objects with at least: time_s, node_id, sat_id, beam_id, sinr_db, rx_power_dbw
  const byNode = new Map()
  rows.forEach((r) => {
    const node = toNumber(r.node_id)
    if (node === null) return
    if (!byNode.has(node)) byNode.set(node, [])
    byNode.get(node).push(r)
  })

  const handovers = []
  for (const [nodeId, list] of byNode.entries()) {
    const sorted = list.slice().sort((a, b) => (toNumber(a.time_s) ?? 0) - (toNumber(b.time_s) ?? 0))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      const prevSat = toNumber(prev.sat_id)
      const curSat = toNumber(cur.sat_id)
      const prevBeam = toNumber(prev.beam_id)
      const curBeam = toNumber(cur.beam_id)

      const satChanged = prevSat !== null && curSat !== null && prevSat >= 0 && curSat >= 0 && prevSat !== curSat
      const beamChanged = prevBeam !== null && curBeam !== null && prevBeam >= 0 && curBeam >= 0 && prevBeam !== curBeam
      if (satChanged || beamChanged) {
        handovers.push({
          node_id: nodeId,
          old_sat_id: prevSat,
          new_sat_id: curSat,
          old_beam_id: prevBeam,
          new_beam_id: curBeam,
          time_s: toNumber(cur.time_s),
          sinr_db: toNumber(cur.sinr_db),
          rx_power_dbw: toNumber(cur.rx_power_dbw),
        })
      }
    }
  }

  // sort by time ascending
  return handovers.sort((a, b) => (a.time_s ?? 0) - (b.time_s ?? 0))
}

export function getLatestHandover(rows = []) {
  const hs = detectHandovers(rows)
  return hs.length ? hs[hs.length - 1] : null
}

export function getActiveLinkState(rows = []) {
  // returns map node_id -> latest row
  const byNode = new Map()
  rows.forEach((r) => {
    const node = toNumber(r.node_id)
    if (node === null) return
    const prev = byNode.get(node)
    if (!prev) byNode.set(node, r)
    else {
      const prevT = toNumber(prev.time_s) ?? 0
      const curT = toNumber(r.time_s) ?? 0
      if (curT >= prevT) byNode.set(node, r)
    }
  })
  return byNode
}

export default {
  detectHandovers,
  getLatestHandover,
  getActiveLinkState,
}
