import { test, expect } from "@playwright/test";
import { appendEvent, generateSessionId, createEvent } from "./helpers";

test.describe("セッション表示", () => {
  test("イベントを受信するとセッションが表示される", async ({ page }) => {
    // Arrange
    const sessionId = generateSessionId();
    await page.goto("/");
    await page.waitForSelector("#status.connected");

    // Act - イベントを送信
    await appendEvent(
      createEvent(sessionId, "PreToolUse", {
        toolName: "Read",
        toolInput: { description: "ファイルを読み込み中" },
      })
    );

    // Assert - セッションが表示される
    await expect(page.locator(".chat-session")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".chat-header .project")).toContainText(
      "my-project"
    );
  });

  test("メッセージが会話として表示される", async ({ page }) => {
    // Arrange
    const sessionId = generateSessionId();
    await page.goto("/");
    await page.waitForSelector("#status.connected");

    // Act - ツール使用イベントを送信
    await appendEvent(
      createEvent(sessionId, "PreToolUse", {
        toolName: "Grep",
        toolInput: { description: "パターンを検索" },
      })
    );

    // Assert - メッセージが表示される
    const message = page.locator(".chat-message");
    await expect(message).toBeVisible({ timeout: 5000 });
    await expect(message.locator(".sender.main")).toBeVisible();
    await expect(message.locator(".text")).toContainText("パターンを検索");
  });

  test("待機中の場合は「待機中...」と表示", async ({ page }) => {
    // Arrange
    const sessionId = generateSessionId();
    await page.goto("/");
    await page.waitForSelector("#status.connected");

    // Act - 会話を生成しないイベント（PostToolUse）
    await appendEvent(createEvent(sessionId, "PostToolUse", { toolName: "Read" }));

    // Assert - 待機中が表示される
    await expect(page.locator(".chat-session")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".chat-empty")).toContainText("待機中");
  });
});
