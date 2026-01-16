#!/usr/bin/env bash
set -euo pipefail

wget -qO- https://get.pnpm.io/install.sh | sh -
PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PNPM_HOME
export PATH="$PNPM_HOME:$PATH"

cd frontend

pnpm env use --global 22 || true
pnpm install
pnpm run build
