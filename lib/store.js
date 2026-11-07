import { get, put, BlobPreconditionFailedError } from "@vercel/blob";

// Small JSON file helpers on the private Blob store (latest copy, safe against two writers at once).
export async function readJson(path) {
  const res = await get(path, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return { value: {}, etag: null };
  // Larger files come back with a "weak" tag (W/"…"); writes compare against the plain tag, so drop the W/.
  return { value: await new Response(res.stream).json(), etag: res.blob.etag ? res.blob.etag.replace(/^W\//, "") : null };
}
export async function updateJson(path, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { value, etag } = await readJson(path);
    const next = change(value);
    try {
      await put(path, JSON.stringify(next), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: !!etag, ...(etag ? { ifMatch: etag } : {}) });
      return next;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError || /already exists/i.test(String(e && e.message)))) throw e;
      await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
    }
  }
  throw new Error("Too many concurrent writes");
}

// Each person's progress lives in one file, <prefix>state.json = { collection: { id: doc } }.
// Older data was split into one file per collection; until the first save, readState merges those (they stay as a backup).
export const COLLECTIONS = ["answers", "days", "redemptions", "grants", "freezes", "lessons"];
export async function readState(prefix) {
  const cur = await readJson(prefix + "state.json");
  if (cur.etag) return cur;
  const parts = await Promise.all(COLLECTIONS.map(async (c) => [c, (await readJson(`${prefix}${c}.json`)).value]));
  return { value: Object.fromEntries(parts), etag: null };
}
// change(state) edits and returns the state, or returns null to refuse (nothing is written).
// A file that was just created or changed can take a moment to read back, so conflicts are retried for several seconds,
// and once state.json is known to exist we wait for it instead of falling back to the old per-collection files.
export async function updateState(prefix, change) {
  let exists = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const cur = exists ? await readJson(prefix + "state.json") : await readState(prefix);
    if (exists && !cur.etag) { await new Promise((r) => setTimeout(r, 250 * (attempt + 1))); continue; }
    const next = change(cur.value);
    if (next === null) return null;
    try {
      await put(prefix + "state.json", JSON.stringify(next), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: !!cur.etag, ...(cur.etag ? { ifMatch: cur.etag } : {}) });
      return next;
    } catch (e) {
      const msg = String(e && e.message);
      if (/already exists/i.test(msg)) exists = true;
      else if (!(e instanceof BlobPreconditionFailedError)) throw e;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  throw new Error("Too many concurrent writes");
}
