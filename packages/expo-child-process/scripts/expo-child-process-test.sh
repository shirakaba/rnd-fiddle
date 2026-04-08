#!/bin/sh

set -eu

printf 'expo-child-process-test\n'
printf 'argv_count=%s\n' "$#"
if [ "$#" -gt 0 ]; then
  printf 'argv=%s\n' "$*"
fi
