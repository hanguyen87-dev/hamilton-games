import { makeSession, sessionCookie, json, sameOrigin } from "../lib/auth.js";

const enc = new TextEncoder();
async function digest(s) { return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(s)))); }
function equal(a, b) { let d = a.length ^ b.length; for (let i = 0; i < Math.min(a.length, b.length); i++) d |= a[i] ^ b[i]; return d === 0; }
// Test mode is its own login that uses the parent password.
const PASSWORDS = { student: () => process.env.STUDENT_PASSWORD, parent: () => process.env.PARENT_PASSWORD, tester: () => process.env.PARENT_PASSWORD };

export default {
  async fetch(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
    const role = body && body.role, password = body && body.password;
    const expected = Object.hasOwn(PASSWORDS, role) && PASSWORDS[role]();
    if (!expected || typeof password !== "string" || password.length > 200 || !equal(await digest(password.trim()), await digest(expected))) {
      await new Promise((r) => setTimeout(r, 600));
      return json({ error: "That password didn’t match. Try again." }, 401);
    }
    return json({ ok: true, role }, 200, { "set-cookie": sessionCookie(await makeSession(role)) });
  }
};
