#!/bin/bash
cd "$(dirname "$0")"
node run-local.js || echo "Node.js is needed. Install it from https://nodejs.org and try again."
read -p "Press Enter to close"
