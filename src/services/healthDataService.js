// src/services/healthDataService.js

// Helper: group rows into fixed UTC buckets and average numeric fields
const bucketize = (rows, bucketMinutes) => {
  if (!bucketMinutes) return rows;

  const bucketMs = bucketMinutes * 60 * 1000;
  const fields = [
    "heartRate", "respiration", "temperature", "humidity",
    "iaq", "eco2", "tvoc", "etoh", "hrv", "stress",
  ];

  // Align buckets to UTC boundaries
  const toBucketKey = (tsMs) => Math.floor(tsMs / bucketMs) * bucketMs;

  const map = new Map();
  for (const r of rows) {
    const t = new Date(r.timestamp).getTime();
    if (Number.isNaN(t)) continue;
    const key = toBucketKey(t);
    let agg = map.get(key);
    if (!agg) {
      agg = { timestamp: new Date(key).toISOString() };
      for (const f of fields) agg[f] = [];
      map.set(key, agg);
    }
    for (const f of fields) {
      const v = r[f];
      if (typeof v === "number" && Number.isFinite(v)) agg[f].push(v);
    }
  }

  // average per bucket (ignore empty -> undefined)
  const out = [];
  for (const [key, agg] of map.entries()) {
    const row = { timestamp: new Date(key + bucketMs).toISOString() }; // bucket end time
    for (const f of fields) {
      const arr = agg[f];
      row[f] = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;
    }
    out.push(row);
  }

  // sort by time
  out.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return out;
};

/**
 * Fetch health data.
 *
 * Backward compatible:
 *   fetchHealthData(deviceId, token, 10) -> last 10 minutes raw
 *
 * New options form:
 *   fetchHealthData(deviceId, token, { rangeMinutes: 60, bucketMinutes: 10 })
 *     -> last 60 minutes, averaged per 10-minute bucket
 */
export const fetchHealthData = async (
  deviceId,
  token,
  minutesOrOptions = 5,
  end = new Date()
) => {
  if (!deviceId) throw new Error("deviceId is required");
  if (!token) throw new Error("auth token missing");

  const opts =
    typeof minutesOrOptions === "number"
      ? { rangeMinutes: minutesOrOptions, bucketMinutes: null }
      : minutesOrOptions || {};

  const rangeMinutes = opts.rangeMinutes ?? 5;
  const bucketMinutes = opts.bucketMinutes ?? null;

  // Convert 'end' to a UTC date (no local offset issues)
  const endDate = end instanceof Date ? end : new Date(end);
  const utcEnd = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
      endDate.getUTCHours(),
      endDate.getUTCMinutes(),
      endDate.getUTCSeconds(),
      endDate.getUTCMilliseconds()
    )
  );
  const utcStart = new Date(utcEnd.getTime() - rangeMinutes * 60 * 1000);

  const id = encodeURIComponent(deviceId);
  const url = `https://admin.dozemate.com/api/data/health/${id}?start=${utcStart.toISOString()}&end=${utcEnd.toISOString()}`;

  console.log("HealthData fetch URL (UTC):", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("HealthData error", { url, status: res.status, body: text });
    throw new Error(`Health data ${res.status}: ${text || res.statusText}`);
  }

  const json = await res.json();
  const rows = Array.isArray(json) ? json : json.data || [];

  // Normalize keys we expect (in case API uses different casing)
  const norm = rows.map((it) => ({
    timestamp: it.timestamp ?? it.time ?? it.ts,
    heartRate: it.heartRate ?? it.hr ?? it.heart_rate,
    respiration: it.respiration ?? it.rr ?? it.resp_rate,
    temperature: it.temperature ?? it.temp,
    humidity: it.humidity,
    iaq: it.iaq,
    eco2: it.eco2 ?? it.eCO2,
    tvoc: it.tvoc,
    etoh: it.etoh,
    hrv: it.hrv,
    stress: it.stress,
  }));

  return bucketize(norm, bucketMinutes);
};
