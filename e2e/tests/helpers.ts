import { appendFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// テスト用のログファイル（e2e/.tmp/events.ndjson）
const TEST_LOG_FILE = resolve(dirname(__dirname), ".tmp/events.ndjson");

/**
 * イベントをログファイルに追記
 * サーバーのポーリング間隔(100ms)を考慮して少し待つ
 */
export async function appendEvent(event: Record<string, unknown>): Promise<void> {
  const line = JSON.stringify(event) + "\n";
  await appendFile(TEST_LOG_FILE, line);
  // サーバーがファイル変更を検知する時間を待つ
  await new Promise((resolve) => setTimeout(resolve, 150));
}

/**
 * テスト用のセッションIDを生成
 */
export function generateSessionId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 基本的なイベントを生成
 */
export function createEvent(
  sessionId: string,
  hookEventName: string,
  options: {
    agentId?: string;
    agentType?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    cwd?: string;
  } = {}
): Record<string, unknown> {
  return {
    hook_event_name: hookEventName,
    session_id: sessionId,
    cwd: options.cwd || "/Users/test/my-project",
    agent_id: options.agentId,
    agent_type: options.agentType,
    tool_name: options.toolName,
    tool_input: options.toolInput,
    logged_at: new Date().toISOString(),
  };
}
