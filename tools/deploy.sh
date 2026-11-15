#!/bin/sh
# Deploy to production on the hademolab Pro team.
# Deploys from a copy WITHOUT .git: when git info is attached, Vercel Pro blocks the deploy
# ("commit author doesn't have permission", TEAM_ACCESS_REQUIRED) because the Mac's commit email isn't a team member.
set -e
APP="$(cd "$(dirname "$0")/.." && pwd)"
# Others push to GitHub too: never deploy a copy that is missing their changes or has unsaved edits.
git -C "$APP" fetch -q origin
if [ -n "$(git -C "$APP" status --porcelain)" ]; then echo "Commit your changes first (git status shows unsaved edits)."; exit 1; fi
if [ "$(git -C "$APP" rev-list --count HEAD..origin/main)" != "0" ]; then echo "GitHub has newer changes. Run: git pull --rebase, then deploy again."; exit 1; fi
if [ "$(git -C "$APP" rev-list --count origin/main..HEAD)" != "0" ]; then echo "Push your commits first (git push), so GitHub matches the site."; exit 1; fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
rsync -a --exclude .git --exclude node_modules --exclude audio-samples --exclude backups --exclude '.env*' "$APP/" "$TMP/"
cd "$TMP" && vercel deploy --prod --yes --scope hademolab
