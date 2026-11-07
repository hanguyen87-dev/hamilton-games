# Hamilton's Game Time

A private, phone-first learning game for Hamilton (almost 5), built from the SAT Daily Ten app's design: a daily set, stars, streaks, prizes from Papa, a parent login, and Test mode.

## What he plays

| Game | Level 1 | Level 5 |
|---|---|---|
| 🔤 Letter Sounds | Which letter says /m/? First sounds of pictures | Read 3-letter words, missing letter, sh, ch, th |
| 🍎 Counting | Count 1 to 5 things | Count to 20, more or fewer, before and after, count by 2s, 5s, and 10s |
| ➕ Adding | Pictures, totals up to 5 | Numbers to 20, take away, missing number (5 + ? = 8) |
| 🪙 Coins | Which one is a penny? Count pennies | Mixed coins up to $1, which group has more money (coins have no numbers from level 4) |
| ⏰ Clock | O'clock | Every 5 minutes, and "which clock says 4:45?" |
| 🗺️ 50 States | Which big state is orange? | Tap-to-find on the map, shapes, capitals, nicknames, postal codes |
| 🚩 Flags | Pick the flag of a famous country | Look-alike flags, capitals, find the country on a map |
| 🌍 Countries | Which huge country is orange? | Tap-to-find, continents, capitals of 65 countries |

- **Questions are made up on the fly**, so they don't run out. Each game has a hidden level (1 to 5): up after 80% right on the first try, down at 40%, worked out from his saved answers.
- **Read aloud:** every question and its choices are spoken (the phone's built-in voice). Word choices have a 🔊 button; 🗣️ repeats the question.
- **Wrong answers** shake and ask for another try. Only the first try counts.

## Reading

- **Letter Sounds** game: sounds in teaching order (m, s, a, t, p, i, n, f, o, d, c, h, e, r, …), first sounds, blending by ear (/k/ /a/ /t/ → 🐱), reading words with tap-to-hear letter tiles and a 🐢 Sound it out button.
- **Stories**: 12 short books written for him in `data/reading.json`, using only sounds he's learning plus a few sight words (the, is, a, I, …). Tapping a word sounds it out, then says it.
- **Voice clips**: `audio/<set>/*.mp3` made once by `tools/build_audio.mjs --set warm|bright` with Google Cloud Text-to-Speech voices (warm = en-US-Neural2-F, bright = en-US-Neural2-H, picked on the Voice page). They say pure sounds like /k/, which the device voice can't. The clip list comes from `clipSpecs()` in `index.html`. Missing clips fall back to the device voice. The API key lives in the Mac Keychain (`hamilton-tts`), never in files. After changing reading content, rerun the script and redeploy.
- **Game voice**: every other line is spoken by the same Google voice through `api/tts.js`: the first time a sentence is needed it is made by Google. Not saved in Blob (the free plan allows only 2,000 Blob writes a month across all the family's apps); Vercel's CDN and the browser keep each line instead. Needs the `GOOGLE_TTS_KEY` env var on Vercel (added from the Keychain, never typed). If the voice can't be reached, the device voice says it. Grown-ups → Voice can switch games back to the device voice.

## Stars and prizes

- Finish **Today's 5** (5 questions from 5 different games): 1 star, +1 if all 5 are right on the first try
- 10 right answers in games in one day: +1 star
- Every 5 days in a row: +3 stars. Papa can freeze the streak for trips or sick days.
- Papa can give special stars with a reason.
- Prizes: sticker 3, bedtime story 5, ice cream 8, park 10, movie night 12, pancakes 15, small toy 25, zoo 40, big toy 60. He asks, Papa marks it given (or cancels, which returns the stars). Prices must match `SHOP` in `index.html` and `SHOP_COST` in `api/db.js`.

## Logins

| Login | What it can do |
|---|---|
| Hamilton | Plays; progress saved |
| Parent | Sees his stars and levels, approves prizes, gives stars, freezes the streak. Games played here aren't saved. |
| Test mode | Link under the login form, parent password. Separate saved test data. |

## How it's built

Same as SAT Daily Ten, no framework, no build step: `index.html` (the whole app), `login.html`, `middleware.js` (login required everywhere), `api/` (login, logout, db, backup), `lib/` (signed cookie, Blob storage with locking). Progress is one private Vercel Blob file: `db/state.json` (his), `test/state.json` (Test mode). A daily cron copies both to `backups/YYYY-MM-DD.json` (60 kept).

`data/states.json` and `data/world.json` are the maps, pre-drawn by `tools/build_geo.cjs` from the public-domain us-atlas / world-atlas (Natural Earth) data.

**Preview locally:** `python3 -m http.server` in this folder and open http://localhost:8000. With no server API it saves in the browser; add `?as=parent` for the grown-up view.

## Online

- Vercel project `hamilton-games` (team `hanguyen-8346s-projects`), private Blob store `hamilton-games-progress`. Live at https://hamilton-games.vercel.app, and at https://games.hanolabs.com once its DNS is in.
- Environment variables (Production): `STUDENT_PASSWORD`, `PARENT_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` (added by the Blob store).
- Deploy a change: `vercel deploy --prod --yes --scope hanguyen-8346s-projects` from this folder. Don't commit a package-lock.json: local npm goes through the Mercor registry and breaks Vercel builds.
- games.hanolabs.com DNS at Squarespace: CNAME `games` -> `22b9ee980dbaa05b.vercel-dns-017.com`, TXT `_vercel` -> `vc-domain-verify=games.hanolabs.com,73a9d51d014b399404b5` (added next to the existing sat and cards TXT records, not replacing them).
- On his iPad or phone: open the address in Safari, Share, Add to Home Screen, log in as Hamilton.

## Notes

- Flags use emoji, which show on iPhone, iPad, and Mac. Windows shows letters instead.
- Not included from the SAT app: phone reminders, friend accounts, the signed note. Easy to add back.

## iPhone and iPad
- Home-screen app: swipe from the left edge to go back one screen (not during a game), pull down at the top to refresh (saves first), swipe sideways on a story to turn pages. In Safari, its own back swipe goes back one screen.
- Day / Night / Auto button in the top bar (saved per device, `hgt-theme`).
- Saving: answers are sent in batches (end of a round, app hidden, 8 waiting, or after a minute) as `PUT /api/db {writes:[...]}`, to stay far under the Blob plan's 2,000 writes a month.

## Adventure (home screen)
- A winding map of 20 levels, Kindergarten to 5th grade, with a prize at the end of each grade (🏅 K, 🏆 1st, 💎 2nd, 🚀 3rd, 🌟 4th, 👑 5th). All 20 levels are built (Kindergarten to 5th grade, 80 lessons).
- Each level has 4 lessons (math, reading, world). A lesson = a few narrated slides to tap through (some are tap-to-count), then 5 practice questions. The level challenge (5 of 6 right on the first try) finishes a level fast.
- Topic order follows free, trusted curricula: Common Core K-5 math, the UFLI Foundations / CKLA phonics order, and the Core Knowledge Sequence for geography. The lesson text is written for this app.
- Content lives in `LEVELS` in index.html; new question makers: shapes, pattern, continents, oceans, tens. Progress: `lessons` collection (one doc per lesson id like "3b", "c3" for a passed challenge).
- Stars (generous): +1 per right answer, Today's 5 +10 (+10 if all right), lesson +3, level +10, grade prize +25 (crown +100), every 5-day streak +30. Prize prices were multiplied by 10 to match (SHOP in index.html = SHOP_COST in api/db.js).
- `tools/build_geo.cjs` also builds the 7 continent shapes (all countries merged; Russia and Turkey left neutral) and ocean label points into data/world.json.

## Lesson library and placement
- Games → each topic has 📘 Learn (lessons, easy to hard) and 🎮 Play (the game). Topics: Coins (10), Clock and time (10), 50 States (10), Flags (8), Countries (10), plus Continents and oceans, Letter sounds, Counting, Adding, Shapes, which reuse the Adventure lessons. `TOPICS` in index.html.
- Facts from public sources: U.S. Mint (coins and who is on them; last circulating penny struck Nov 12, 2025, pennies still legal tender), U.S. Census Bureau (the 4 regions), CIA World Factbook (countries, capitals). Topic order follows Common Core and the Core Knowledge Sequence.
- A library lesson passed with 4 of 5 right on the first try counts for the Adventure: `LIB` maps each Adventure lesson to the library lessons that cover it.
- Placement quiz ("Find my level!" on the map, and in Grown-ups): 3 questions per level (math, reading, world) from Level 3; 2 of 3 = passed, go up; the first miss stops it (or steps down until a level passes). Saved as lessons/place {lv}; levels up to lv count as done. It only moves him up.

## Grades 2 to 5 (Levels 9-20)
- New question makers: numbers (place value, even/odd, compare, rounding), arith (2-digit add/subtract, times tables with arrays, division, 2-digit x 1-digit, long division, order of operations), money (bills and coins, $ notation, making change), graph (bar graphs), measure (ruler, area, perimeter, angles, volume), frac (fractions, equal fractions, compare, add, fraction of a number, decimals), coord (grid points), words (vowel teams, short stories written for the app, main idea, nouns/verbs/adjectives, synonyms/antonyms, prefixes/suffixes), facts (maps, landforms, solar system, food chains, ocean life, latitude/longitude, the human body).
- Review lessons can mix several question makers: a lesson's p may be a list of specs.
- Library topics added for these: Big numbers, Add/subtract/times/divide, Fractions and decimals, Dollars and cents, Measuring/graphs/grids, Reading and grammar, Science and Earth.
