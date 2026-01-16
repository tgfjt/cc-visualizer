# Claude Code Agent Visualizer

## これは何か

Claude Codeのエージェントの動きを可視化して、一人開発に「ワイワイ感」「グルーブ感」を生み出すツール。

## なぜ作るか

- 一人開発で失われる「チームの空気感」を取り戻す
- エージェントが働いてる様子を眺める楽しさ（ネトゲ的）
- 副次的にデバッグや挙動理解にも役立つ

## 大事なこと

1. **本筋に影響しない**: Claude Codeのレスポンスを絶対に悪化させない
2. **楽しさ優先**: 効率や実用性より「眺めて楽しい」を優先する
3. **シンプルに始める**: 最初は「誰が何してるか」が見えればいい

---

## 辿り着きたい場所

**最終形**: 
エージェントたちが空間の中で動き回り、作業し、おしゃべりしている様子が見える。分報的なつぶやきが流れてくる。複数のClaude Codeセッションが同じ空間に共存して賑やか。

**MVP**:
イベントがリアルタイムで流れてきて「誰が今何してるか」がわかる。

---

## 確立したこと

### 1. hooksで何が取れるか ✅

**結果: 期待以上に取れる！**

利用可能なイベント:
- `PreToolUse` / `PostToolUse`: ツール実行前後
- `SubagentStart` / `SubagentStop`: サブエージェントのライフサイクル
- `SessionStart` / `SessionEnd`: セッションのライフサイクル
- `Stop`: メインエージェント終了
- `Notification`: 各種通知

取得できるデータ:
- `session_id`: セッション識別子 ✅
- `tool_name`, `tool_input`, `tool_response`: ツール情報 ✅
- `tool_use_id`: 各ツール呼び出しのID ✅
- `transcript_path`: 完全な履歴ファイルへのパス ✅
- `cwd`: 作業ディレクトリ ✅

### 2. 複数エージェントの識別 ✅

**結果: 可能！**

- `SubagentStart` / `SubagentStop` イベントで検出可能
- サブエージェント名でmatcherを設定可能
- トランスクリプトは `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` に保存される

→ 「誰が」の部分は実装できる。親子関係も表現可能。

### 3. つぶやき生成のコスト

**これは後回し**: MVPには不要。まず生イベントを流す。

---

## 残っている不確実性

- 実際にhooksが動くか（次のステップで検証）
- ログの肥大化がどの程度か
- WebSocket再接続時の状態復元の実装難易度

---

## 確立の順序

```
hooksで何が取れるか        ✅ 調査完了（期待以上）
        ↓
ログファイルに安定して書ける  ✅ 動作確認済み
        ↓
サーバーがログを拾える       ✅ Deno + tail
        ↓
WebSocketで流せる           ✅ 接続・配信確認済み
        ↓
ブラウザで見える            ✅ イベント表示確認済み
        ↓
    === MVP達成！ ===
        ↓
エージェント状態を管理できる
        ↓
キャラ化（名前、色）
        ↓
つぶやき生成
        ↓
空間表現
```

各段階で「ここまでは動く」を確認してから次へ。

---

## アーキテクチャ

```
Claude Code (複数可)
    ↓ hooks (NDJSON追記)
ログファイル
    ↓ tail
可視化サーバー (Deno)
    ↓ WebSocket
ブラウザUI
```

**なぜこの構成か**:
- ファイル経由にすることで、hooks内の処理を最小限に（本筋への影響ゼロ）
- Denoはセットアップ不要でTSがそのまま動く
- WebSocketでリアルタイム性を確保

---

## 技術的な制約

**hooksの制約**:
- コマンドはシンプルに（失敗しても本筋に影響させない）
- 重い処理は絶対にやらない

**ログファイル**:
- 肥大化対策が必要（logrotate等）
- パース失敗に耐える設計

**WebSocket**:
- 再接続時の状態復元が必要

---

## データ構造（暫定）

hooksで取れるものがわかってから確定する。

### イベント（正規化後）

```typescript
type AgentEvent = 
  | { type: 'agent_start'; agentId: string; sessionId: string; parentId?: string }
  | { type: 'agent_stop'; agentId: string; sessionId: string; result: 'success' | 'error' }
  | { type: 'tool_use'; agentId: string; sessionId: string; tool: string; target?: string }
  | { type: 'progress'; agentId: string; sessionId: string; message: string };
```

### エージェント

```typescript
interface Agent {
  id: string;
  sessionId: string;
  name?: string;        // キャラ化後
  color?: string;       // キャラ化後
  status: 'active' | 'inactive';
  lastSeen: Date;
}
```

---

## ファイル構成

```
cc-visualizer/
├── PLANS.md
├── CLAUDE.md
├── .claude/
│   └── settings.json   # hooks設定（このプロジェクト用）
├── hooks/
│   ├── log-event.sh    # イベントをNDJSONで記録
│   └── README.md       # 取得できるデータの調査結果
├── server/             # TODO
│   ├── deno.json
│   ├── main.ts
│   ├── tail.ts
│   ├── parser.ts
│   ├── state.ts
│   └── ws.ts
└── ui/                 # TODO
    ├── package.json
    ├── vite.config.ts
    └── src/
```

ログ出力先: `~/.cc-visualizer/events.ndjson`

---

## 将来の拡張（優先度は後で決める）

- つぶやき生成（LLM呼び出し）
- 2D空間表現
- 複数セッション混在表示
- 音（イベント時のSE）
- モバイル対応
- Slack連携
