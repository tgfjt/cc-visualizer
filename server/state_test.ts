import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  processEvent,
  getActiveAgents,
  getAllAgents,
  getSnapshot,
  type AgentEvent,
} from "./state.ts";

// テスト間で状態をリセットするためのヘルパー
// 注: 実際のstate.tsはモジュールスコープでMapを持っているため、
// テスト間で状態が共有される。本番ではリセット関数を追加するか、
// クラスベースの設計に変更すべき。

Deno.test("SubagentStart でエージェントが追加される", () => {
  const event: AgentEvent = {
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-001",
    agent_type: "Explore",
    logged_at: new Date().toISOString(),
  };

  processEvent(event);

  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-001");

  assertEquals(agent?.status, "active");
  assertEquals(agent?.type, "Explore");
  assertEquals(agent?.sessionId, "session-1");
});

Deno.test("SubagentStop でエージェントが inactive になる", () => {
  // まず開始
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-002",
    agent_type: "Bash",
    logged_at: new Date().toISOString(),
  });

  // 次に停止
  processEvent({
    hook_event_name: "SubagentStop",
    session_id: "session-1",
    agent_id: "agent-002",
    logged_at: new Date().toISOString(),
  });

  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-002");

  assertEquals(agent?.status, "inactive");
});

Deno.test("PreToolUse でツール使用中が記録される", () => {
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-003",
    agent_type: "Plan",
    logged_at: new Date().toISOString(),
  });

  processEvent({
    hook_event_name: "PreToolUse",
    session_id: "session-1",
    agent_id: "agent-003",
    tool_name: "Read",
    logged_at: new Date().toISOString(),
  });

  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-003");

  assertEquals(agent?.currentTool, "Read");
});

Deno.test("PostToolUse でツール使用が終了する", () => {
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-004",
    agent_type: "Bash",
    logged_at: new Date().toISOString(),
  });

  processEvent({
    hook_event_name: "PreToolUse",
    session_id: "session-1",
    agent_id: "agent-004",
    tool_name: "Bash",
    logged_at: new Date().toISOString(),
  });

  processEvent({
    hook_event_name: "PostToolUse",
    session_id: "session-1",
    agent_id: "agent-004",
    tool_name: "Bash",
    logged_at: new Date().toISOString(),
  });

  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-004");

  assertEquals(agent?.currentTool, undefined);
});

Deno.test("getActiveAgents は active なエージェントのみ返す", () => {
  // active なエージェントを追加
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-2",
    agent_id: "active-agent",
    agent_type: "Explore",
    logged_at: new Date().toISOString(),
  });

  // inactive にする別のエージェント
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-2",
    agent_id: "inactive-agent",
    agent_type: "Bash",
    logged_at: new Date().toISOString(),
  });
  processEvent({
    hook_event_name: "SubagentStop",
    session_id: "session-2",
    agent_id: "inactive-agent",
    logged_at: new Date().toISOString(),
  });

  const activeAgents = getActiveAgents();
  const activeIds = activeAgents.map((a) => a.id);

  assertEquals(activeIds.includes("active-agent"), true);
  assertEquals(activeIds.includes("inactive-agent"), false);
});

Deno.test("getSnapshot は agents を含む", () => {
  const snapshot = getSnapshot();

  assertEquals(Array.isArray(snapshot.agents), true);
});
