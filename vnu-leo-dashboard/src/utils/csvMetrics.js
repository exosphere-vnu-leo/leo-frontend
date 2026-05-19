const ROUTER_IDS = [1, 2, 3, 4, 5];

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "nan") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvText(csvText) {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  return seconds.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function getElevationEstimate(row) {
  const satId = toNumber(row.sat_id);
  const beamId = toNumber(row.beam_id);
  const timeValue = toNumber(row.time_s) ?? 0;
  const sinr = toNumber(row.sinr_db);

  if (satId === null || beamId === null || satId < 0 || beamId < 0) {
    return { value: 0, estimated: true };
  }

  const sinrFactor = Number.isFinite(sinr) ? Math.max(0, Math.min(1, (sinr + 5) / 35)) : 0.5;
  const timeFactor = (Math.sin(timeValue / 12) + 1) / 2;
  const value = 10 + sinrFactor * 35 + timeFactor * 35;
  return { value: Math.max(10, Math.min(80, value)), estimated: true };
}

function isConnected(row) {
  const satId = toNumber(row.sat_id);
  const beamId = toNumber(row.beam_id);
  return satId !== null && beamId !== null && satId >= 0 && beamId >= 0;
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function sum(values) {
  return values.filter((value) => Number.isFinite(value)).reduce((total, value) => total + value, 0);
}

function uniqueCount(values) {
  return new Set(values.filter((value) => Number.isFinite(value) && value >= 0)).size;
}

function latestRow(rows) {
  return rows.slice().sort((left, right) => (toNumber(left.time_s) ?? -Infinity) - (toNumber(right.time_s) ?? -Infinity)).at(-1) ?? null;
}

function buildSeries(rows, key) {
  return rows
    .slice()
    .sort((left, right) => (toNumber(left.time_s) ?? 0) - (toNumber(right.time_s) ?? 0))
    .map((row) => ({
      time_s: toNumber(row.time_s),
      time: formatTime(toNumber(row.time_s)),
      value: toNumber(row[key]),
    }))
    .filter((point) => point.time_s !== null && Number.isFinite(point.value));
}

function buildLatestMetrics(row) {
  if (!row) return null;
  const elevation = getElevationEstimate(row);
  return {
    time_s: toNumber(row.time_s),
    time: formatTime(toNumber(row.time_s)),
    node_type: row.node_type,
    node_id: toNumber(row.node_id),
    channel_type: row.channel_type || null,
    sat_id: toNumber(row.sat_id),
    beam_id: toNumber(row.beam_id),
    c_n_db: toNumber(row.c_n_db),
    fspl_db: toNumber(row.fspl_db),
    atm_loss_db: toNumber(row.atm_loss_db),
    rx_power_dbw: toNumber(row.rx_power_dbw),
    sinr_db: toNumber(row.sinr_db),
    rx_bytes: toNumber(row.rx_bytes),
    connected: isConnected(row),
    elevation_deg: elevation.value,
    elevation_estimated: elevation.estimated,
  };
}

export function buildCsvMetrics(csvText) {
  const firstLine = csvText ? csvText.split(/\r?\n/).find((line) => line.trim()) ?? "" : "";
  const headers = firstLine ? splitCsvLine(firstLine) : [];
  const requiredColumns = ["time_s", "node_type", "node_id", "channel_type", "sat_id", "beam_id", "c_n_db", "fspl_db", "atm_loss_db", "rx_power_dbw", "sinr_db", "rx_bytes"];
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  const rows = parseCsvText(csvText);

  const byNodeType = {
    UT: rows.filter((row) => String(row.node_type).trim() === "UT"),
    GW: rows.filter((row) => String(row.node_type).trim() === "GW"),
  };

  const routerRowsById = ROUTER_IDS.reduce((accumulator, nodeId) => {
    accumulator[nodeId] = byNodeType.UT.filter((row) => toNumber(row.node_id) === nodeId);
    return accumulator;
  }, {});

  const gatewayRows = byNodeType.GW.slice().sort((left, right) => (toNumber(left.time_s) ?? 0) - (toNumber(right.time_s) ?? 0));

  const routerLatestById = ROUTER_IDS.reduce((accumulator, nodeId) => {
    accumulator[nodeId] = buildLatestMetrics(latestRow(routerRowsById[nodeId]));
    return accumulator;
  }, {});

  const gatewayLatest = buildLatestMetrics(latestRow(gatewayRows));
  const routerSeriesById = ROUTER_IDS.reduce((accumulator, nodeId) => {
    const rowsForNode = routerRowsById[nodeId];
    accumulator[nodeId] = {
      sinr_db: buildSeries(rowsForNode, "sinr_db"),
      c_n_db: buildSeries(rowsForNode, "c_n_db"),
      rx_power_dbw: buildSeries(rowsForNode, "rx_power_dbw"),
      fspl_db: buildSeries(rowsForNode, "fspl_db"),
      rx_bytes: buildSeries(rowsForNode, "rx_bytes"),
    };
    return accumulator;
  }, {});

  const gatewaySeries = {
    sinr_db: buildSeries(gatewayRows, "sinr_db"),
    rx_bytes: buildSeries(gatewayRows, "rx_bytes"),
    rx_power_dbw: buildSeries(gatewayRows, "rx_power_dbw"),
  };

  const latestRouterRows = ROUTER_IDS.map((nodeId) => routerLatestById[nodeId]).filter(Boolean);

  return {
    rows,
    headers,
    missingColumns,
    byNodeType,
    routerRowsById,
    routerLatestById,
    gatewayRows,
    gatewayLatest,
    routerSeriesById,
    gatewaySeries,
    routerIds: ROUTER_IDS,
    routerAggregate: {
      averageSinr: average(latestRouterRows.map((row) => row.sinr_db)),
      averageCn: average(latestRouterRows.map((row) => row.c_n_db)),
      averageRxPower: average(latestRouterRows.map((row) => row.rx_power_dbw)),
      totalRxBytes: sum(latestRouterRows.map((row) => row.rx_bytes)),
      activeSatellites: uniqueCount(latestRouterRows.map((row) => row.sat_id)),
      activeBeams: uniqueCount(latestRouterRows.map((row) => row.beam_id)),
    },
    gatewayAggregate: {
      averageSinr: average(gatewayRows.map((row) => toNumber(row.sinr_db))),
      averageCn: average(gatewayRows.map((row) => toNumber(row.c_n_db))),
      averageRxPower: average(gatewayRows.map((row) => toNumber(row.rx_power_dbw))),
      totalRxBytes: sum(gatewayRows.map((row) => toNumber(row.rx_bytes))),
      activeSatellites: uniqueCount(gatewayRows.map((row) => toNumber(row.sat_id))),
      activeBeams: uniqueCount(gatewayRows.map((row) => toNumber(row.beam_id))),
    },
  };
}
