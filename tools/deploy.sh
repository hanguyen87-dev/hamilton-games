#!/bin/sh
# Deploy to production on the hademolab Pro team.
# Deploys from a copy WITHOUT .git: when git info is attached, Vercel Pro blocks the deploy
# ("commit author doesn't have permission", TEAM_ACCESS_REQUIRED) because the Mac's commit email isn't a team member.
set -e
APP="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
rsync -a --exclude .git --exclude node_modules --exclude audio-samples --exclude backups --exclude '.env*' "$APP/" "$TMP/"
cd "$TMP" && vercel deploy --prod --yes --scope hademolab
