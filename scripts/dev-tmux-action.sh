#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOCKET_NAME="rnd-fiddle-dev"
SESSION_NAME="rnd-fiddle-dev"
WINDOW_NAME="dev"

tmux_dev() {
  tmux -L "$SOCKET_NAME" "$@"
}

pane_target() {
  case "$1" in
    0)
      printf '%s\n' "$SESSION_NAME:$WINDOW_NAME.0"
      ;;
    1)
      printf '%s\n' "$SESSION_NAME:$WINDOW_NAME.1"
      ;;
    *)
      echo "Unknown pane index: $1" >&2
      exit 1
      ;;
  esac
}

other_pane_index() {
  case "$1" in
    0)
      printf '1\n'
      ;;
    1)
      printf '0\n'
      ;;
    *)
      echo "Unknown pane index: $1" >&2
      exit 1
      ;;
  esac
}

pane_command() {
  printf '%s\n' 'node --run start'
}

wait_for_shell() {
  target=$1
  attempts=0

  while [ "$attempts" -lt 200 ]; do
    command_name=$(tmux_dev display-message -p -t "$target" "#{pane_current_command}" 2>/dev/null || true)

    case "$command_name" in
      sh|bash|zsh|fish)
        return 0
        ;;
    esac

    attempts=$((attempts + 1))
    sleep 0.05
  done

  return 1
}

interrupt_pane() {
  tmux_dev send-keys -t "$1" C-c
}

focus_pane() {
  tmux_dev select-pane -t "$1"
}

restart_pane() {
  target=$1

  interrupt_pane "$target"
  wait_for_shell "$target"
  tmux_dev send-keys -t "$target" "$(pane_command)" C-m
}

ACTION=$1
CURRENT_PANE_INDEX=$2
CURRENT_TARGET=$(pane_target "$CURRENT_PANE_INDEX")
OTHER_TARGET=$(pane_target "$(other_pane_index "$CURRENT_PANE_INDEX")")
METRO_TARGET=$(pane_target 0)
VITE_TARGET=$(pane_target 1)

case "$ACTION" in
  kill-current)
    interrupt_pane "$CURRENT_TARGET"
    ;;
  kill-other)
    focus_pane "$OTHER_TARGET"
    interrupt_pane "$OTHER_TARGET"
    ;;
  kill-both-close)
    interrupt_pane "$METRO_TARGET"
    interrupt_pane "$VITE_TARGET"
    wait_for_shell "$METRO_TARGET" || true
    wait_for_shell "$VITE_TARGET" || true
    tmux_dev kill-session -t "$SESSION_NAME"
    ;;
  restart-current)
    restart_pane "$CURRENT_TARGET"
    ;;
  restart-both)
    interrupt_pane "$METRO_TARGET"
    interrupt_pane "$VITE_TARGET"
    wait_for_shell "$METRO_TARGET"
    wait_for_shell "$VITE_TARGET"
    tmux_dev send-keys -t "$METRO_TARGET" "$(pane_command)" C-m
    tmux_dev send-keys -t "$VITE_TARGET" "$(pane_command)" C-m
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    exit 1
    ;;
esac
