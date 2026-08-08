// Public aggregate counts for the download page. Same numbers we see —
// per-day ping totals, nothing else exists to share.

import { readStats } from "@/lib/telemetryStore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end();
    return;
  }
  try {
    const stats = await readStats();
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    res.status(200).json(stats);
  } catch (error) {
    console.error("stats read failed:", error?.message);
    res.status(500).json({ error: "storage failure" });
  }
}
