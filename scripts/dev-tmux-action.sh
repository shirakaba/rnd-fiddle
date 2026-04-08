#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
DESKTOP_ROOT="$REPO_ROOT/apps/desktop"
WEB_ROOT="$REPO_ROOT/apps/web"
WINDOW_NAME="dev"
SOCKET_NAME=$1
SESSION_NAME=$2
METRO_PORT=$3
VITE_PORT=$4
MACOS_OFFSET=$5
ACTION=$6
CURRENT_PANE_INDEX=$7
DEFAULT_SHELL=${SHELL:-/bin/zsh}

tmux_dev() {
  tmux -L "$SOCKET_NAME" "$@"
}

shell_command() {
  command=$1
  escaped_command=$(printf '%s' "$command" | sed "s/'/'\\\\''/g")
  printf "%s\n" "$DEFAULT_SHELL -i -c '$escaped_command; exec $DEFAULT_SHELL -i'"
}

pane_target() {
  case "$1" in
    0)
      printf '%s\n' "$SESSION_NAME:$WINDOW_NAME.0"
      ;;
    1)
      printf '%s\n' "$SESSION_NAME:$WINDOW_NAME.1"
      ;;
    2)
      printf '%s\n' "$SESSION_NAME:$WINDOW_NAME.2"
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
  pane_index=$1

  case "$pane_index" in
    0)
      command="EXPO_NO_TYPESCRIPT_SETUP=1 VITE_PORT=$VITE_PORT node --run start -- --port $METRO_PORT"
      ;;
    1)
      command="node --run start -- --port $VITE_PORT"
      ;;
    *)
      echo "Unknown pane index: $pane_index" >&2
      exit 1
      ;;
  esac

  printf '%s\n' "$command"
}

pane_dir() {
  case "$1" in
    0)
      printf '%s\n' "$DESKTOP_ROOT"
      ;;
    1)
      printf '%s\n' "$WEB_ROOT"
      ;;
    *)
      echo "Unknown pane index: $1" >&2
      exit 1
      ;;
  esac
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

pane_is_shell() {
  target=$1
  command_name=$(tmux_dev display-message -p -t "$target" "#{pane_current_command}" 2>/dev/null || true)

  case "$command_name" in
    sh|bash|zsh|fish)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

interrupt_pane() {
  tmux_dev send-keys -t "$1" C-c
}

focus_pane() {
  tmux_dev select-pane -t "$1"
}

restart_pane() {
  target=$1
  pane_index=$2

  tmux_dev respawn-pane -k -t "$target" -c "$(pane_dir "$pane_index")" "$(shell_command "$(pane_command "$pane_index")")"
}

CURRENT_TARGET=$(pane_target "$CURRENT_PANE_INDEX")
OTHER_PANE_INDEX=$(other_pane_index "$CURRENT_PANE_INDEX")
OTHER_TARGET=$(pane_target "$OTHER_PANE_INDEX")
METRO_TARGET=$(pane_target 0)
VITE_TARGET=$(pane_target 1)
MACOS_TARGET=$(pane_target 2)

wait_for_all_panes_to_be_shells() {
  while ! pane_is_shell "$METRO_TARGET" || ! pane_is_shell "$VITE_TARGET" || ! pane_is_shell "$MACOS_TARGET"; do
    sleep 0.1
  done
}

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
    wait_for_all_panes_to_be_shells
    tmux_dev kill-session -t "$SESSION_NAME"
    ;;
  restart-current)
    restart_pane "$CURRENT_TARGET" "$CURRENT_PANE_INDEX"
    ;;
  restart-both)
    tmux_dev respawn-pane -k -t "$METRO_TARGET" -c "$(pane_dir 0)" "$(shell_command "$(pane_command 0)")"
    tmux_dev respawn-pane -k -t "$VITE_TARGET" -c "$(pane_dir 1)" "$(shell_command "$(pane_command 1)")"
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    exit 1
    ;;
esac
