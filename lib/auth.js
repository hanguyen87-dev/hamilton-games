// Signed session cookie shared by the middleware and the API functions (Web Crypto works in both).
export const COOKIE = "hgt_session";
export const MAX_AGE = 180 * 24 * 3600;
const enc = new TextEncoder();

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmacKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is missing");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function makeSession(role, user) {
  const payload = b64url(enc.encode(JSON.stringify({ r: role, ...(user ? { u: user } : {}), exp: Date.now() + MAX_AGE * 1000 })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload));
  return payload + "." + b64url(sig);
}

export function readCookie(request, name = COOKIE) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// Returns { role, user } for a valid, unexpired session ("student" | "parent" | "tester"); otherwise null.
export async function getSession(request) {
  try {
    const token = readCookie(request);
    if (!token) return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!data || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return ["student", "parent", "tester"].includes(data.r) ? { role: data.r, user: null } : null;
  } catch {
    return null;
  }
}
export async function getRole(request) { const s = await getSession(request); return s ? s.role : null; }

export function sessionCookie(value, maxAge = MAX_AGE) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
}

// Reject cross-site writes: a browser always sends Origin on POST/PUT.
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
