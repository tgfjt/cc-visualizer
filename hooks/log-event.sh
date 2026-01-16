#!/bin/bash
# Claude Code hooks からイベントを受け取り、NDJSONでログファイルに追記
# 標準入力からJSONを受け取る

LOG_DIR="${HOME}/.cc-visualizer"
LOG_FILE="${LOG_DIR}/events.ndjson"

# ログディレクトリがなければ作成
mkdir -p "$LOG_DIR"

# 標準入力からJSONを読み取り、タイムスタンプを付けて追記
read -r input
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# jqがあればタイムスタンプを付与、なければそのまま出力
if command -v jq &> /dev/null; then
    echo "$input" | jq -c --arg ts "$timestamp" '. + {logged_at: $ts}' >> "$LOG_FILE"
else
    echo "$input" >> "$LOG_FILE"
fi
