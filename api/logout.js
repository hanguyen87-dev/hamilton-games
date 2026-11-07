import { sessionCookie, json, sameOrigin } from "../lib/auth.js";

export default {
  async fetch(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }
};
