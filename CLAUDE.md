# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Claude Codeのエージェント動作をリアルタイムで可視化するツール。一人開発に「ワイワイ感」を生み出すことが目的。

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

### コンポーネント

- **server/**: Denoで実装。ログファイルをtailしてWebSocketで配信
- **ui/**: Vite + フロントエンド。WebSocketでイベントを受信して表示
- **hooks/**: Claude Code hooksの設定と取得イベントのドキュメント

## 開発コマンド

### サーバー (Deno)
```bash
cd server
deno task dev    # 開発サーバー起動
deno task start  # 本番起動
deno test        # テスト実行
```

### UI
```bash
cd ui
npm install
npm run dev      # Vite開発サーバー
npm run build    # ビルド
npm test         # テスト実行
```

## 設計上の重要な制約

1. **本筋に影響しない**: hooks内の処理は最小限に。失敗してもClaude Codeのレスポンスに影響させない
2. **楽しさ優先**: 効率や実用性より「眺めて楽しい」を優先
3. **パース失敗に耐える**: ログの一部が壊れても全体は動き続ける設計

## データ構造

```typescript
// イベント（正規化後）
type AgentEvent =
  | { type: 'agent_start'; agentId: string; sessionId: string; parentId?: string }
  | { type: 'agent_stop'; agentId: string; sessionId: string; result: 'success' | 'error' }
  | { type: 'tool_use'; agentId: string; sessionId: string; tool: string; target?: string }
  | { type: 'progress'; agentId: string; sessionId: string; message: string };

// エージェント状態
interface Agent {
  id: string;
  sessionId: string;
  name?: string;
  color?: string;
  status: 'active' | 'inactive';
  lastSeen: Date;
}
```

## 不確実性への対応

hooksで取得できる情報が限定的な場合の代替案がPLANS.mdに記載されている。実装前に必ず確認すること。
