import { put, list, del } from "@vercel/blob";
import { COLLECTIONS, readState } from "../lib/store.js";
import { timingSafeEqual } from "node:crypto";

// Daily copy of all progress (his data and Test mode) to backups/YYYY-MM-DD.json in the same private store.
// Called by Vercel Cron, which sends "Authorization: Bearer <CRON_SECRET>". Keeps 60 days.
const KEEP_DAYS = 60;

function authorized(request) {
  const secret = process.env.CRON_SECRET || "";
  const got = Buffer.from(request.headers.get("authorization") || ""), want = Buffer.from("Bearer " + secret);
  return secret.length >= 32 && got.length === want.length && timingSafeEqual(got, want);
}
async function readAll(prefix) {
  const state = (await readState(prefix)).value;
  return Object.fromEntries(COLLECTIONS.map((c) => [c, state[c] || {}]));
}

export default {
  async fetch(request) {
    if (!authorized(request)) return new Response("Not found", { status: 404 });
    const day = new Date().toISOString().slice(0, 10);
    const body = { savedAt: new Date().toISOString(), student: await readAll("db/"), testMode: await readAll("test/") };
    await put(`backups/${day}.json`, JSON.stringify(body), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
    const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
    const { blobs } = await list({ prefix: "backups/" });
    const old = blobs.filter((b) => b.pathname.slice(8, 18) < cutoff).map((b) => b.url);
    if (old.length) await del(old);
    return Response.json({ ok: true, day, removed: old.length });
  }
};
