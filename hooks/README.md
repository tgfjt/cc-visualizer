# Hooks設定

## 概要

Claude Codeのhooksを使って、エージェントのイベントをNDJSON形式でログファイルに出力する。

## 出力先

```
~/.cc-visualizer/events.ndjson
```

## キャプチャするイベント

| イベント | 説明 |
|---------|------|
| PreToolUse | ツール実行前 |
| PostToolUse | ツール実行後 |
| SubagentStart | サブエージェント開始 |
| SubagentStop | サブエージェント終了 |
| Stop | メインエージェント終了 |
| SessionStart | セッション開始/再開 |
| SessionEnd | セッション終了 |

## 取得できるデータ（調査結果）

### 共通フィールド
- `session_id`: セッション識別子
- `transcript_path`: トランスクリプトファイルのパス
- `cwd`: 作業ディレクトリ
- `hook_event_name`: イベント名

### PreToolUse / PostToolUse
- `tool_name`: ツール名（Bash, Read, Edit, Write, Task等）
- `tool_input`: ツールへの入力
- `tool_use_id`: ツール呼び出しID
- `tool_response`: 結果（PostToolUseのみ）

### SubagentStart / SubagentStop
- サブエージェント名でmatcher可能
- `stop_hook_active`: 別のStop hookが実行中か（SubagentStop）

### SessionStart
- `source`: `startup` / `resume` / `clear` / `compact`

### SessionEnd
- `reason`: `exit` / `clear` / `logout` / `prompt_input_exit` / `other`

## ログの確認

```bash
# リアルタイムで見る
tail -f ~/.cc-visualizer/events.ndjson

# 整形して見る
tail -f ~/.cc-visualizer/events.ndjson | jq .
```
