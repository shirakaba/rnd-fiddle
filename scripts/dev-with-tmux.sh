#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
WINDOW_NAME="dev"
ACTION_SCRIPT="$SCRIPT_DIR/dev-tmux-action.sh"
PORT_OFFSET=${1:-0}
SOCKET_NAME="rnd-fiddle-dev"
SESSION_NAME="rnd-fiddle-dev"

case "$PORT_OFFSET" in
  ''|*[!0-9]*)
    echo "Port offset must be a non-negative integer." >&2
    exit 1
    ;;
esac

METRO_PORT=$((8081 + PORT_OFFSET))
VITE_PORT=$((5173 + PORT_OFFSET))
MACOS_OFFSET=$PORT_OFFSET
METRO_COMMAND="node --run start -- --port $METRO_PORT"
VITE_COMMAND="node --run start -- --port $VITE_PORT"
MACOS_COMMAND="node --run macos -- $MACOS_OFFSET"

tmux_dev() {
  tmux -L "$SOCKET_NAME" "$@"
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

start_pane_command() {
  target=$1
  command=$2

  wait_for_shell "$target"
  tmux_dev send-keys -t "$target" "$command" C-m
}

prefill_pane_command() {
  target=$1
  command=$2

  wait_for_shell "$target"
  tmux_dev send-keys -t "$target" "$command"
}

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required for 'node --run dev'." >&2
  exit 1
fi

if tmux_dev has-session -t "$SESSION_NAME" 2>/dev/null; then
  exec env TMUX= tmux -L "$SOCKET_NAME" attach-session -t "$SESSION_NAME"
fi

tmux_dev new-session -d -s "$SESSION_NAME" -n "$WINDOW_NAME" -c "$REPO_ROOT"
tmux_dev split-window -h -t "$SESSION_NAME:$WINDOW_NAME.0" -c "$REPO_ROOT/web"
tmux_dev split-window -h -t "$SESSION_NAME:$WINDOW_NAME.1" -c "$REPO_ROOT"
tmux_dev select-layout -t "$SESSION_NAME:$WINDOW_NAME" even-horizontal
tmux_dev set-option -t "$SESSION_NAME" mouse on >/dev/null
tmux_dev set-window-option -t "$SESSION_NAME:$WINDOW_NAME" remain-on-exit on >/dev/null
tmux_dev set-window-option -t "$SESSION_NAME:$WINDOW_NAME" pane-border-status top >/dev/null
tmux_dev set-window-option -t "$SESSION_NAME:$WINDOW_NAME" pane-border-format " #{pane_title} " >/dev/null
tmux_dev bind-key -n C-c if-shell -F "#{||:#{==:#{pane_index},0},#{==:#{pane_index},1}}" \
  "display-menu -C 1 -T 'Process Control' \
  'Back' '' 'display-message \"\"' \
  'Kill #{?#{==:#{pane_index},0},Metro,Vite}' '' 'run-shell \"sh $ACTION_SCRIPT $SOCKET_NAME $SESSION_NAME $METRO_PORT $VITE_PORT $MACOS_OFFSET kill-current #{pane_index}\"' \
  'Kill #{?#{==:#{pane_index},0},Vite,Metro}' '' 'run-shell \"sh $ACTION_SCRIPT $SOCKET_NAME $SESSION_NAME $METRO_PORT $VITE_PORT $MACOS_OFFSET kill-other #{pane_index}\"' \
  'Kill Metro and Vite' '' 'run-shell \"sh $ACTION_SCRIPT $SOCKET_NAME $SESSION_NAME $METRO_PORT $VITE_PORT $MACOS_OFFSET kill-both-close #{pane_index}\"' \
  '' '' '' \
  'Restart #{?#{==:#{pane_index},0},Metro,Vite}' '' 'run-shell \"sh $ACTION_SCRIPT $SOCKET_NAME $SESSION_NAME $METRO_PORT $VITE_PORT $MACOS_OFFSET restart-current #{pane_index}\"' \
  'Restart Metro and Vite' '' 'run-shell \"sh $ACTION_SCRIPT $SOCKET_NAME $SESSION_NAME $METRO_PORT $VITE_PORT $MACOS_OFFSET restart-both #{pane_index}\"'" \
  "send-keys C-c"
tmux_dev select-pane -t "$SESSION_NAME:$WINDOW_NAME.0" -T "Metro (port $METRO_PORT)"
tmux_dev select-pane -t "$SESSION_NAME:$WINDOW_NAME.1" -T "Vite (port $VITE_PORT)"
tmux_dev select-pane -t "$SESSION_NAME:$WINDOW_NAME.2" -T "Mac app (port $METRO_PORT)"
tmux_dev select-pane -t "$SESSION_NAME:$WINDOW_NAME.0"

start_pane_command "$SESSION_NAME:$WINDOW_NAME.0" "$METRO_COMMAND"
start_pane_command "$SESSION_NAME:$WINDOW_NAME.1" "$VITE_COMMAND"
prefill_pane_command "$SESSION_NAME:$WINDOW_NAME.2" "$MACOS_COMMAND"

exec env TMUX= tmux -L "$SOCKET_NAME" attach-session -t "$SESSION_NAME"
