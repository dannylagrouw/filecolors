#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: ./filecolors.sh <file> [--port <port>]" >&2
}

FILE_PATH=""
PORT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --port|-p)
      PORT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [ -n "$FILE_PATH" ]; then
        usage
        exit 1
      fi
      FILE_PATH="$1"
      shift
      ;;
  esac
done

if [ -z "$FILE_PATH" ]; then
  usage
  exit 1
fi

if [ ! -e "$FILE_PATH" ]; then
  echo "Error: file does not exist: $FILE_PATH" >&2
  exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
  echo "Error: not a regular file: $FILE_PATH" >&2
  exit 1
fi

if [ ! -r "$FILE_PATH" ]; then
  echo "Error: file is not readable: $FILE_PATH" >&2
  exit 1
fi

resolve_script_path() {
  local source="${BASH_SOURCE[0]}"
  while [ -h "$source" ]; do
    local dir
    dir="$(cd -P "$(dirname "$source")" && pwd)"
    source="$(readlink "$source")"
    case "$source" in
      /*) ;;
      *) source="$dir/$source" ;;
    esac
  done
  cd -P "$(dirname "$source")" && pwd
}

SCRIPT_DIR="$(resolve_script_path)"
ABS_FILE_PATH="$(cd "$(dirname "$FILE_PATH")" && pwd)/$(basename "$FILE_PATH")"

export FILECOLORS_FILE="$ABS_FILE_PATH"
if [ -n "$PORT" ]; then
  export PORT
fi

cd "$SCRIPT_DIR"
exec bun run src/server/index.ts
