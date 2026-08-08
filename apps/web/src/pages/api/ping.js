// Anonymous daily ping from the desktop app.
//
// Accepts exactly {v: "x.y.z", os: "windows"|...} and counts it toward
// today's total. Nothing about the request is stored besides those two
// fields as aggregate buckets — no IP, no user agent, no cookies, no ID.

import { recordPing } from "@/lib/telemetryStore";

export const config = {
  api: { bodyParser: { sizeLimit: "2kb" } },
};

const VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const KNOWN_OS = new Set(["windows", "macos", "linux"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  const body = req.body ?? {};
  const version = typeof body.v === "string" ? body.v.trim() : "";
  const osRaw = typeof body.os === "string" ? body.os.trim().toLowerCase() : "";

  if (!VERSION_RE.test(version)) {
    res.status(400).json({ error: "invalid version" });
    return;
  }
  const os = KNOWN_OS.has(osRaw) ? osRaw : "other";

  try {
    await recordPing(version, os);
    res.status(204).end();
  } catch (error) {
    console.error("ping store failed:", error?.message);
    res.status(500).json({ error: "storage failure" });
  }
}
