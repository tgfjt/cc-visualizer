# テストガイドライン

## 基本ルール

### 3A パターン（Arrange-Act-Assert）

すべてのテストは3Aパターンで構成する：

```typescript
Deno.test("関数名: 期待する動作を日本語で説明", () => {
  // Arrange（準備）
  // テストに必要なデータやモックを準備

  // Act（実行）
  // テスト対象の関数を実行

  // Assert（検証）
  // 結果が期待通りかを検証
});
```

### 例

```typescript
import { assertEquals } from "jsr:@std/assert";
import { clearSessions, processEvent, getSessions } from "./state.ts";

Deno.test("processEvent: 新しいセッションが作成される", () => {
  // Arrange
  clearSessions();
  const event = {
    hook_event_name: "PreToolUse",
    session_id: "test-session-001",
    cwd: "/path/to/project",
    logged_at: new Date().toISOString(),
  };

  // Act
  processEvent(event);

  // Assert
  const sessions = getSessions();
  assertEquals(sessions.length, 1);
  assertEquals(sessions[0].id, "test-session-001");
});
```

---

## 命名規則

### テスト名は日本語で
- `"関数名: 期待する動作を日本語で説明"`
- 例: `"extractAction: descriptionがあればそれを返す"`
- 例: `"broadcastToClients: 接続中のクライアントにのみ送信される"`

### テストファイル名
- `{対象ファイル名}_test.ts`
- 例: `state_test.ts`, `broadcast_test.ts`

---

## テスト独立性

### 各テスト前にクリーンアップ
グローバル状態を使う場合は、各テスト前にリセットする：

```typescript
Deno.test("テスト1", () => {
  // Arrange
  clearSessions();  // 状態をリセット
  // ...
});

Deno.test("テスト2", () => {
  // Arrange
  clearSessions();  // 状態をリセット
  // ...
});
```

### モックの使用
外部依存（WebSocket、ファイルシステム等）はモックを使う：

```typescript
Deno.test("broadcast: WebSocketに送信される", () => {
  // Arrange
  const sentMessages: string[] = [];
  const mockClient = {
    readyState: WebSocket.OPEN,
    send: (msg: string) => sentMessages.push(msg),
  };

  // Act
  broadcast([mockClient], "テストメッセージ");

  // Assert
  assertEquals(sentMessages, ["テストメッセージ"]);
});
```

---

## カバレッジ目標

### 必須
- 正常系: 期待通りの入力で期待通りの出力
- 境界値: 空配列、null、undefined、0など

### 推奨
- 異常系: 不正な入力に対するエラーハンドリング
- エッジケース: 最大値、最小値、特殊文字

---

## 実行方法

```bash
# 全テスト実行
deno task test

# 特定ファイルのみ
deno test -A server/state_test.ts

# ウォッチモード
deno test -A --watch
```
