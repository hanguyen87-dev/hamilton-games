import { next } from "@vercel/functions";
import { getSession } from "./lib/auth.js";

// Everything (the page, the map data, the API) needs a login, except the login page itself.
const PUBLIC = new Set(["/login", "/login.html", "/api/login", "/robots.txt", "/favicon.ico", "/manifest.webmanifest", "/api/backup"]);  // the cron job checks its own secret

export default async function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC.has(url.pathname) || url.pathname.startsWith("/icons/")) return next();
  if (await getSession(request)) return next();
  if (url.pathname.startsWith("/api/")) return Response.json({ error: "Please log in." }, { status: 401, headers: { "cache-control": "no-store" } });
  return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "no-store" } });
}
