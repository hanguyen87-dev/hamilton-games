import { del } from "@vercel/blob";
import { COLLECTIONS, readState, updateState } from "../lib/store.js";
import { getSession, json, sameOrigin } from "../lib/auth.js";

// Progress lives in one private file: db/state.json (Hamilton). Test mode gets its own, test/state.json.
//   answers     one per question tried: { g: game, d: day, ok: right on the first try, t: time }
//   days        one per finished "Today's 5": { d: day, n: right on the first try, t: time }
//   redemptions reward requests; grants = stars from a parent; freezes = streak pauses
//   lessons     one per finished Adventure lesson (id like "3b") or level challenge ("c3"): { lv, n: best right on the first try, of, pass?, d, t }
const PARENT_ONLY = new Set(["grants", "freezes"]);
const PARENT_WRITES = new Set([...PARENT_ONLY, "redemptions"]);
const ID = /^[A-Za-z0-9_.:-]{1,120}$/;
const MAX_BODY = 64 * 1024;
const BATCH = new Set(["answers", "days", "lessons"]), MAX_BATCH = 60;

// Reward shop: Hamilton can only ask for a reward at its real price; only a parent can mark it given or cancel it.
// Must match SHOP in index.html.
const SHOP_COST = { sticker: 30, story: 50, icecream: 80, park: 100, movie: 120, pancakes: 150, toy: 250, zoo: 400, bigtoy: 600 };
function studentRedemptionError(existing, doc) {
  if (existing) return "This reward request already exists.";
  if (doc.status !== "requested" || !Object.hasOwn(SHOP_COST, doc.item) || doc.stars !== SHOP_COST[doc.item]) return "Bad reward request.";
  return null;
}
function parentRedemptionError(existing, doc) {
  if (!["requested", "delivered", "cancelled"].includes(doc.status) || !Object.hasOwn(SHOP_COST, doc.item)) return "Bad reward update.";
  return null;
}

export default {
  async fetch(request) {
    const session = await getSession(request);
    if (!session) return json({ error: "Please log in." }, 401);
    const role = session.role;
    const adult = role === "parent" || role === "tester";
    // Where data lives depends only on who is logged in.
    const prefix = role === "tester" ? "test/" : "db/";

    if (request.method === "GET") {
      const state = (await readState(prefix)).value;
      return json({ role, space: prefix === "test/" ? "test" : "his", data: Object.fromEntries(COLLECTIONS.map((c) => [c, state[c] || {}])) });
    }

    if (request.method === "PUT") {
      if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
      const text = await request.text();
      if (text.length > MAX_BODY) return json({ error: "Too large" }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: "Bad request" }, 400); }
      // A batch of answers (and the day's Today's 5) is saved in one write: the free Blob plan allows 2,000 writes a month.
      if (Array.isArray(body && body.writes)) {
        const w = body.writes;
        if (!w.length || w.length > MAX_BATCH || !w.every((x) => x && BATCH.has(x.c) && typeof x.id === "string" && ID.test(x.id) && x.doc && typeof x.doc === "object" && !Array.isArray(x.doc))) return json({ error: "Bad request" }, 400);
        if (role === "parent") return json({ error: "The parent login doesn’t save games." }, 403);
        await updateState(prefix, (state) => { for (const x of w) (state[x.c] || (state[x.c] = {}))[x.id] = x.doc; return state; });
        return json({ ok: true });
      }
      const { c, id, doc } = body || {};
      if (!COLLECTIONS.includes(c) || typeof id !== "string" || !ID.test(id) || !doc || typeof doc !== "object" || Array.isArray(doc)) return json({ error: "Bad request" }, 400);
      // The parent login only changes the parent tools; parent play stays in the browser.
      if (role === "parent" && !PARENT_WRITES.has(c)) return json({ error: "The parent login doesn’t save games." }, 403);
      if (PARENT_ONLY.has(c) && !adult) return json({ error: "Only a parent can change this." }, 403);
      if (c === "freezes") {
        const day = /^\d{4}-\d{2}-\d{2}$/, span = (Date.parse(doc.to) - Date.parse(doc.from)) / 864e5;
        if (!day.test(doc.from || "") || !day.test(doc.to || "") || !(span >= 0 && span <= 30) || (doc.reason != null && (typeof doc.reason !== "string" || doc.reason.length > 120))) return json({ error: "Bad streak freeze." }, 400);
      }
      if (c === "grants" && (!Number.isInteger(doc.stars) || doc.stars < 1 || doc.stars > 500 || typeof doc.reason !== "string" || doc.reason.length > 200)) return json({ error: "Bad star gift." }, 400);
      const guard = c !== "redemptions" ? null : adult ? (old) => parentRedemptionError(old, doc) : (old) => studentRedemptionError(old, doc);
      let refused = null;
      await updateState(prefix, (state) => {
        const docs = state[c] || (state[c] = {});
        refused = guard && guard(docs[id]);
        if (refused) return null;
        docs[id] = doc;
        return state;
      });
      if (refused) return json({ error: refused }, 403);
      return json({ ok: true });
    }

    if (request.method === "DELETE") {
      if (role !== "tester") return json({ error: "Only Test mode data can be cleared." }, 403);
      if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
      await del([prefix + "state.json"]).catch(() => {});
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  }
};
