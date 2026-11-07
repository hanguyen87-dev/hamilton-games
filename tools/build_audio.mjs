// Makes the reading clips (audio/<id>.mp3 + audio/index.json) once, with a Google Cloud Text-to-Speech voice.
// The clip list comes from clipSpecs() in index.html, so the app and this script never disagree.
//
// One-time setup: save the API key in the Mac Keychain (it is never printed):
//   security add-generic-password -a "$USER" -s hamilton-tts -w
// Then, from the app folder:
//   node tools/build_audio.mjs --samples        voice samples in audio-samples/ to pick a voice
//   node tools/build_audio.mjs --set warm       all clips for one reading voice (existing files are kept; add --force to redo)
//   node tools/build_audio.mjs --set bright
// Each set goes to audio/<set>/ and must match READ_SETS in index.html.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), flag = (f) => args.includes(f), opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const SETS = { warm: "en-US-Neural2-F", bright: "en-US-Neural2-H" };
const SET = opt("--set", "warm"), RATE = +opt("--rate", "0.9");
if (!Object.hasOwn(SETS, SET)) { console.error(`Unknown --set ${SET}. Use: ${Object.keys(SETS).join(", ")}`); process.exit(1); }
const VOICE = SETS[SET];
const SAMPLE_VOICES = ["en-US-Neural2-F", "en-US-Neural2-H", "en-US-Neural2-C", "en-US-Neural2-D", "en-US-Wavenet-F", "en-US-Wavenet-H"];

function apiKey() {
  try { return execFileSync("security", ["find-generic-password", "-s", "hamilton-tts", "-w"], { encoding: "utf8" }).trim(); }
  catch { console.error('No key in the Keychain. Run: security add-generic-password -a "$USER" -s hamilton-tts -w'); process.exit(1); }
}

// Run the app's own code (without a browser) to get clipSpecs().
function loadSpecs() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const js = html.slice(html.indexOf('<script>\n"use strict";') + 8, html.lastIndexOf("</script>"));
  const dummy = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : dummy()), apply: () => dummy(), set: () => true });
  const ctx = { document: dummy(), window: {}, localStorage: { getItem: () => null, setItem() {} }, location: { hostname: "x", search: "" }, matchMedia: () => ({ matches: true }),
    fetch: () => new Promise(() => {}), setTimeout, clearTimeout, URLSearchParams, console };
  vm.createContext(ctx);
  vm.runInContext(js + "\n;globalThis.__T = { GEO, clipSpecs };", ctx);
  ctx.__T.GEO.reading = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reading.json"), "utf8"));
  return ctx.__T.clipSpecs();
}

async function synth(key, spec, voice) {
  const body = { input: spec.ssml ? { ssml: spec.ssml } : { text: spec.text }, voice: { languageCode: voice.slice(0, 5), name: voice }, audioConfig: { audioEncoding: "MP3", speakingRate: RATE } };
  for (let attempt = 1; ; attempt++) {
    const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
    if (r.ok) return Buffer.from((await r.json()).audioContent, "base64");
    const msg = (await r.text()).slice(0, 300);
    if (attempt < 4 && (r.status === 429 || r.status >= 500)) { await new Promise((res) => setTimeout(res, 1500 * attempt)); continue; }
    throw new Error(`${r.status} ${msg}`);
  }
}

const key = apiKey(), specs = loadSpecs(), SAFE = /^[a-z0-9-]+$/;
if (specs.some((s) => !SAFE.test(s.id))) throw new Error("bad clip id");

if (flag("--samples")) {
  const dir = path.join(ROOT, "audio-samples"), pickIds = ["p-0", "q-letter-m", "s-m", "s-t", "s-a", "a-first-snake", "t-sam-2"];
  fs.mkdirSync(dir, { recursive: true });
  for (const voice of SAMPLE_VOICES) for (const id of pickIds) {
    const spec = specs.find((s) => s.id === id);
    fs.writeFileSync(path.join(dir, `${voice}__${id}.mp3`), await synth(key, spec, voice));
  }
  console.log(`Samples for ${SAMPLE_VOICES.length} voices in audio-samples/`);
  process.exit(0);
}

const dir = path.join(ROOT, "audio", SET);
fs.mkdirSync(dir, { recursive: true });
const todo = specs.filter((s) => flag("--force") || !fs.existsSync(path.join(dir, s.id + ".mp3")));
let done = 0, failed = [];
const queue = todo.slice();
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let s; (s = queue.shift());) {
    try { fs.writeFileSync(path.join(dir, s.id + ".mp3"), await synth(key, s, VOICE)); done++; }
    catch (e) { failed.push(`${s.id}: ${e.message}`); }
  }
}));
const have = specs.map((s) => s.id).filter((id) => fs.existsSync(path.join(dir, id + ".mp3"))).sort();
fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(have));
console.log(`${SET} (${VOICE}): made ${done}, skipped ${specs.length - todo.length}, failed ${failed.length}, total ${have.length}/${specs.length}`);
if (failed.length) { console.log(failed.slice(0, 10).join("\n")); process.exit(1); }
