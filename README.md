# Hamilton's Game Time

A private, phone-first learning game for Hamilton (almost 5), built from the SAT Daily Ten app's design: a daily set, stars, streaks, prizes from Papa, a parent login, and Test mode.

## What he plays

| Game | Level 1 | Level 5 |
|---|---|---|
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
