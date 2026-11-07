import { get, put } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";
import { createHash } from "node:crypto";
import { getSession, json, sameOrigin } from "../lib/auth.js";

// Game sentences in a Google voice: GET /api/tts?v=warm&t=Great%20job!
// Each sentence is made once (Google Cloud Text-to-Speech) and kept in the private store as tts/<v>/<hash>.mp3,
// so after the first time it plays from storage without calling Google. Voices must match READ_SETS in index.html.
const VOICES = { warm: "en-US-Neural2-F", bright: "en-US-Neural2-H" };
const RATE = 0.9;
const MAX_TEXT = 300;
const AUDIO_HEADERS = { "content-type": "audio/mpeg", "cache-control": "private, max-age=31536000, immutable" };

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

    const path = `tts/${v}/${createHash("sha256").update(`${VOICES[v]}|${RATE}|${text}`).digest("hex")}.mp3`;
    try {
      const saved = await get(path, { access: "private" });
      if (saved && saved.statusCode === 200) return new Response(saved.stream, { headers: AUDIO_HEADERS });
    } catch { /* not saved yet */ }

    let audio;
    try { audio = await synthesize(text, VOICES[v], key); } catch { return json({ error: "Voice service failed." }, 502); }
    waitUntil(put(path, audio, { access: "private", contentType: "audio/mpeg", addRandomSuffix: false, allowOverwrite: true }).catch(() => {}));
    return new Response(audio, { headers: AUDIO_HEADERS });
  },
};
