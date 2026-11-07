import { getSession, json, sameOrigin } from "../lib/auth.js";

// Game sentences in a Google voice: GET /api/tts?v=warm&t=Great%20job!
// Made by Google Cloud Text-to-Speech the first time, then kept by Vercel's CDN and the browser (same URL = same audio),
// so repeats don't call Google. Not saved in Blob: the free plan allows only 2,000 Blob writes a month for all apps.
// Voices must match READ_SETS in index.html.
const VOICES = { warm: "en-US-Neural2-F", bright: "en-US-Neural2-H" };
const RATE = 0.9;
const MAX_TEXT = 300;
const AUDIO_HEADERS = { "content-type": "audio/mpeg", "cache-control": "private, max-age=31536000, immutable", "vercel-cdn-cache-control": "max-age=31536000" };

async function synthesize(text, voice, key) {
  const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ input: { text }, voice: { languageCode: "en-US", name: voice }, audioConfig: { audioEncoding: "MP3", speakingRate: RATE } }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error("Google TTS " + r.status);
  return Buffer.from((await r.json()).audioContent, "base64");
}

export default {
  async fetch(request) {
    if (!(await getSession(request))) return json({ error: "Please log in." }, 401);
    // Only the app's own pages may ask (each new sentence costs a little).
    const site = request.headers.get("sec-fetch-site");
    if (!sameOrigin(request) || (site && site !== "same-origin")) return json({ error: "Not allowed." }, 403);
    const url = new URL(request.url), v = url.searchParams.get("v") || "", text = (url.searchParams.get("t") || "").trim();
    if (!Object.hasOwn(VOICES, v) || !text || text.length > MAX_TEXT || /[<>]/.test(text)) return json({ error: "Bad request." }, 400);
    const key = process.env.GOOGLE_TTS_KEY;
    if (!key) return json({ error: "No voice key." }, 503);

    try { return new Response(await synthesize(text, VOICES[v], key), { headers: AUDIO_HEADERS }); }
    catch { return json({ error: "Voice service failed." }, 502); }
  },
};
