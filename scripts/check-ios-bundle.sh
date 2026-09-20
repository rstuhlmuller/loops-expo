#!/bin/sh
# Run with Expo serving on port 8081; fails on unresolved imports or syntax errors.
set -eu
curl --fail --silent --show-error --output /dev/null \
  'http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&minify=false&transform.routerRoot=src%2Fapp'
