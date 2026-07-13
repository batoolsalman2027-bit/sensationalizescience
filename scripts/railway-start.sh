#!/usr/bin/env bash
set -euo pipefail

# Persist SQLite + rendered videos on the Railway volume mounted at /data
mkdir -p /data/db /data/renders
rm -rf ./data
ln -sfn /data/db ./data
mkdir -p ./public
rm -rf ./public/renders
ln -sfn /data/renders ./public/renders

exec npm run start -- -p "${PORT:-3000}"
