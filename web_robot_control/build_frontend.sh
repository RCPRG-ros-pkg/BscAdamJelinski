#!/bin/bash

wget -qO- https://get.pnpm.io/install.sh | sh -

cd frontend

pnpm install
pnpm run build
