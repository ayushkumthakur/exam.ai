#!/bin/sh
set -eu

DATA_PATH="${DATA_DIR:-/data}"
mkdir -p "$DATA_PATH"

# Preserve existing database/backups while handing the persistent volume to the
# dedicated app user. The app itself never runs as root.
chown -R node:node "$DATA_PATH"
exec gosu node "$@"
