import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  formatTime,
  extractAction,
  extractProjectName,
  getToolIcon,
} from "./public/js/utils.js";

// =============================================================================
// formatTime のテスト
// =============================================================================

Deno.test("formatTime: タイムスタンプをHH:MM形式に変換する", () => {
  // Arrange
  // Note: タイムゾーンに依存するので、実行環境によって結果が変わる可能性がある
  const timestamp = new Date("2024-01-15T14:32:00").getTime();

  // Act
  const result = formatTime(timestamp);

  // Assert
  // HH:MM形式であることを確認（時刻自体はタイムゾーン依存）
  assertEquals(/^\d{2}:\d{2}$/.test(result), true);
});

// =============================================================================
// extractAction のテスト
// =============================================================================

Deno.test("extractAction: descriptionがあればそれを返す", () => {
  // Arrange
  const event = { tool_input: { description: "ファイルを読み込む" } };

  // Act
  const result = extractAction(event);

  // Assert
  assertEquals(result, "ファイルを読み込む");
});

Deno.test("extractAction: file_pathがあればファイル名を含むメッセージを返す", () => {
  // Arrange
  const event = { tool_input: { file_path: "/path/to/index.html" } };

  // Act
  const result = extractAction(event);

  // Assert
  assertEquals(result, "index.html を操作中");
});

Deno.test("extractAction: commandがあればコマンドを含むメッセージを返す", () => {
  // Arrange
  const event = { tool_input: { command: "git status" } };

  // Act
  const result = extractAction(event);

  // Assert
  assertEquals(result, "git status");
});

Deno.test("extractAction: 長いコマンドは切り詰められる", () => {
  // Arrange
  const longCommand = "a".repeat(100);
  const event = { tool_input: { command: longCommand } };

  // Act
  const result = extractAction(event);

  // Assert
  assertEquals(result?.length, 63); // 60 + "..."
  assertEquals(result?.endsWith("..."), true);
});

Deno.test("extractAction: patternがあれば検索メッセージを返す", () => {
  // Arrange
  const event = { tool_input: { pattern: "function.*" } };

  // Act
  const result = extractAction(event);

  // Assert
  assertEquals(result, "検索: function.*");
});

Deno.test("extractAction: tool_inputがなければnullを返す", () => {
  // Arrange
  const event = {};

  // Act
  const result = extractAction(event);

  // Assert
  assertEquals(result, null);
});

// =============================================================================
// extractProjectName のテスト
// =============================================================================

Deno.test("extractProjectName: cwdから最後のディレクトリ名を抽出する", () => {
  // Arrange
  const cwd = "/Users/tgfjt/projects/my-app";

  // Act
  const result = extractProjectName(cwd);

  // Assert
  assertEquals(result, "my-app");
});

Deno.test("extractProjectName: cwdがなければunknownを返す", () => {
  // Arrange & Act
  const result = extractProjectName(null);

  // Assert
  assertEquals(result, "unknown");
});

Deno.test("extractProjectName: 空文字ならunknownを返す", () => {
  // Arrange & Act
  const result = extractProjectName("");

  // Assert
  assertEquals(result, "unknown");
});

// =============================================================================
// getToolIcon のテスト
// =============================================================================

Deno.test("getToolIcon: Readに対応するアイコンを返す", () => {
  assertEquals(getToolIcon("Read"), "📖");
});

Deno.test("getToolIcon: Editに対応するアイコンを返す", () => {
  assertEquals(getToolIcon("Edit"), "✏️");
});

Deno.test("getToolIcon: Bashに対応するアイコンを返す", () => {
  assertEquals(getToolIcon("Bash"), "💻");
});

Deno.test("getToolIcon: 未知のツールにはデフォルトアイコンを返す", () => {
  assertEquals(getToolIcon("Unknown"), "🔧");
});
