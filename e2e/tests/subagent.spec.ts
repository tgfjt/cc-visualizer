import { test, expect } from "@playwright/test";
import { appendEvent, generateSessionId, createEvent } from "./helpers";

test.describe("サブエージェント表示", () => {

  test("Taskツール使用でサブエージェントへのメッセージが表示される", async ({
    page,
  }) => {
    // Arrange
    const sessionId = generateSessionId();
    await page.goto("/");
    await page.waitForSelector("#status.connected");

    // Act - Task ツールでサブエージェント呼び出し
    await appendEvent(
      createEvent(sessionId, "PreToolUse", {
        toolName: "Task",
        toolInput: {
          subagent_type: "Explore",
          description: "コードベースを調査",
        },
      })
    );

    // Assert - メインからサブへのメッセージが表示
    const session = page.locator(".chat-session");
    await expect(session).toBeVisible({ timeout: 5000 });

    const message = session.locator(".chat-message");
    await expect(message).toBeVisible();
    await expect(message.locator(".mention")).toContainText("@Explore");
    await expect(message.locator(".text")).toContainText("コードベースを調査");
  });

  test("サブエージェント完了で「完了」メッセージが表示される", async ({
    page,
  }) => {
    // Arrange
    const sessionId = generateSessionId();
    const agentId = "agent-" + Date.now();
    await page.goto("/");
    await page.waitForSelector("#status.connected");

    // Act - サブエージェント開始→停止
    await appendEvent(
      createEvent(sessionId, "PreToolUse", {
        toolName: "Task",
        toolInput: {
          subagent_type: "Explore",
          description: "調査開始",
        },
      })
    );
    await appendEvent(
      createEvent(sessionId, "SubagentStart", {
        agentId,
        agentType: "Explore",
      })
    );
    await appendEvent(
      createEvent(sessionId, "SubagentStop", {
        agentId,
        agentType: "Explore",
      })
    );

    // Assert - 完了メッセージが表示（セッション内でスコープ）
    const session = page.locator(".chat-session");
    await expect(session).toBeVisible({ timeout: 5000 });

    const messages = session.locator(".chat-message");
    await expect(messages).toHaveCount(2);

    // 2番目のメッセージが返信（サブエージェントから）
    const reply = messages.nth(1);
    await expect(reply).toHaveClass(/reply/);
    await expect(reply.locator(".sender.sub")).toContainText("Explore");
    await expect(reply.locator(".text")).toContainText("完了");
  });

  test("複数のサブエージェントのやりとりが表示される", async ({ page }) => {
    // Arrange
    const sessionId = generateSessionId();
    const agent1 = "agent-1";
    const agent2 = "agent-2";
    await page.goto("/");
    await page.waitForSelector("#status.connected");

    // Act - 2つのサブエージェントを起動して完了
    // Explore エージェント
    await appendEvent(
      createEvent(sessionId, "PreToolUse", {
        toolName: "Task",
        toolInput: { subagent_type: "Explore", description: "探索タスク" },
      })
    );
    await appendEvent(
      createEvent(sessionId, "SubagentStart", {
        agentId: agent1,
        agentType: "Explore",
      })
    );

    // Bash エージェント
    await appendEvent(
      createEvent(sessionId, "PreToolUse", {
        toolName: "Task",
        toolInput: { subagent_type: "Bash", description: "コマンド実行" },
      })
    );
    await appendEvent(
      createEvent(sessionId, "SubagentStart", {
        agentId: agent2,
        agentType: "Bash",
      })
    );

    // 両方完了
    await appendEvent(
      createEvent(sessionId, "SubagentStop", {
        agentId: agent1,
        agentType: "Explore",
      })
    );
    await appendEvent(
      createEvent(sessionId, "SubagentStop", {
        agentId: agent2,
        agentType: "Bash",
      })
    );

    // Assert - 4つのメッセージ（2つの依頼 + 2つの完了）（セッション内でスコープ）
    const session = page.locator(".chat-session");
    await expect(session).toBeVisible({ timeout: 5000 });

    const messages = session.locator(".chat-message");
    await expect(messages).toHaveCount(4);

    // メンションを確認
    const mentions = session.locator(".mention");
    await expect(mentions.nth(0)).toContainText("@Explore");
    await expect(mentions.nth(1)).toContainText("@Bash");
  });
});
