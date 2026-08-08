// File-backed counter for the anonymous daily ping.
//
// Privacy contract (see /download): a ping carries an app version and an OS
// name, nothing else. This store keeps aggregate counts per UTC day only —
// no IPs, no user agents, no identifiers. Designed for a single self-hosted
// `next start` process; writes are serialized and atomic (tmp + rename).

import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_FILE =
  process.env.NEXTHIVE_STATS_FILE ||
  path.join(process.cwd(), "data", "telemetry.json");

const MAX_VERSION_BUCKETS_PER_DAY = 50;
const MAX_TRACKED_DAYS = 400;

let cache = null;
let writeQueue = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {
    cache = { days: {} };
  }
  if (typeof cache !== "object" || cache === null || !cache.days) {
    cache = { days: {} };
  }
  return cache;
}

function pruneOldDays(days) {
  const keys = Object.keys(days).sort();
  while (keys.length > MAX_TRACKED_DAYS) {
    delete days[keys.shift()];
  }
}

async function persist() {
  const tmp = `${DATA_FILE}.tmp`;
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(cache), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Record one ping for today. `version` and `os` are pre-validated. */
export async function recordPing(version, os) {
  writeQueue = writeQueue.then(async () => {
    const data = await load();
    const key = utcDayKey();
    data.days[key] ??= { total: 0, byVersion: {}, byOs: {} };
    const day = data.days[key];
    day.total += 1;
    if (
      day.byVersion[version] !== undefined ||
      Object.keys(day.byVersion).length < MAX_VERSION_BUCKETS_PER_DAY
    ) {
      day.byVersion[version] = (day.byVersion[version] ?? 0) + 1;
    }
    day.byOs[os] = (day.byOs[os] ?? 0) + 1;
    pruneOldDays(data.days);
    await persist();
  });
  return writeQueue;
}

/** Aggregate counts for the public stats endpoint. */
export async function readStats() {
  const data = await load();
  const today = utcDayKey();
  const yesterday = utcDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const keys = Object.keys(data.days).sort().slice(-14);
  return {
    today: data.days[today]?.total ?? 0,
    yesterday: data.days[yesterday]?.total ?? 0,
    days: keys.map((date) => ({ date, count: data.days[date].total })),
  };
}
