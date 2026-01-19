import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  processEvent,
  getActiveAgents,
  getAllAgents,
  getSnapshot,
  getSessions,
  clearSessions,
  type AgentEvent,
} from "./state.ts";

// =============================================================================
// clearSessions のテスト
// =============================================================================

Deno.test("clearSessions: セッションがすべてクリアされる", () => {
  // Arrange
  const event: AgentEvent = {
    hook_event_name: "PreToolUse",
    session_id: "clear-test-session",
    cwd: "/path/to/project",
    logged_at: new Date().toISOString(),
  };
  processEvent(event);

  // Act
  clearSessions();

  // Assert
  assertEquals(getSessions().length, 0);
});

Deno.test("clearSessions: クリア後に新しいセッションを追加できる", () => {
  // Arrange
  processEvent({
    hook_event_name: "PreToolUse",
    session_id: "old-session",
    logged_at: new Date().toISOString(),
  });
  clearSessions();

  // Act
  processEvent({
    hook_event_name: "PreToolUse",
    session_id: "new-session",
    cwd: "/new/project",
    logged_at: new Date().toISOString(),
  });

  // Assert
  const sessions = getSessions();
  assertEquals(sessions.length, 1);
  assertEquals(sessions[0].id, "new-session");
});

// =============================================================================
// SubagentStart / SubagentStop のテスト
// =============================================================================

Deno.test("SubagentStart: エージェントが追加される", () => {
  // Arrange
  clearSessions();
  const event: AgentEvent = {
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-001",
    agent_type: "Explore",
    cwd: "/path/to/project",
    logged_at: new Date().toISOString(),
  };

  // Act
  processEvent(event);

  // Assert
  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-001");
  assertEquals(agent?.status, "active");
  assertEquals(agent?.type, "Explore");
  assertEquals(agent?.sessionId, "session-1");
});

Deno.test("SubagentStop: エージェントがinactiveになる", () => {
  // Arrange
  clearSessions();
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-002",
    agent_type: "Bash",
    logged_at: new Date().toISOString(),
  });

  // Act
  processEvent({
    hook_event_name: "SubagentStop",
    session_id: "session-1",
    agent_id: "agent-002",
    logged_at: new Date().toISOString(),
  });

  // Assert
  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-002");
  assertEquals(agent?.status, "inactive");
});

// =============================================================================
// PreToolUse / PostToolUse のテスト
// =============================================================================

Deno.test("PreToolUse: ツール使用中が記録される", () => {
  // Arrange
  clearSessions();
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-003",
    agent_type: "Plan",
    logged_at: new Date().toISOString(),
  });

  // Act
  processEvent({
    hook_event_name: "PreToolUse",
    session_id: "session-1",
    agent_id: "agent-003",
    tool_name: "Read",
    tool_input: { description: "Reading file" },
    logged_at: new Date().toISOString(),
  });

  // Assert
  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-003");
  assertEquals(agent?.currentAction, "Reading file");
});

Deno.test("PostToolUse: ツール使用が終了する", () => {
  // Arrange
  clearSessions();
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
    tool_input: { description: "Running command" },
    logged_at: new Date().toISOString(),
  });

  // Act
  processEvent({
    hook_event_name: "PostToolUse",
    session_id: "session-1",
    agent_id: "agent-004",
    tool_name: "Bash",
    logged_at: new Date().toISOString(),
  });

  // Assert
  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-004");
  assertEquals(agent?.currentAction, undefined);
});

// =============================================================================
// getActiveAgents のテスト
// =============================================================================

Deno.test("getActiveAgents: activeなエージェントのみ返す", () => {
  // Arrange
  clearSessions();
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-2",
    agent_id: "active-agent",
    agent_type: "Explore",
    logged_at: new Date().toISOString(),
  });
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

  // Act
  const activeAgents = getActiveAgents();

  // Assert
  const activeIds = activeAgents.map((a) => a.id);
  assertEquals(activeIds.includes("active-agent"), true);
  assertEquals(activeIds.includes("inactive-agent"), false);
});

// =============================================================================
// getSnapshot / getSessions のテスト
// =============================================================================

Deno.test("getSnapshot: sessionsを含む", () => {
  // Arrange
  clearSessions();

  // Act
  const snapshot = getSnapshot();

  // Assert
  assertEquals(Array.isArray(snapshot.sessions), true);
});

Deno.test("getSessions: セッション単位でグルーピングする", () => {
  // Arrange
  clearSessions();
  const now = new Date().toISOString();
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-group-test",
    agent_id: "group-agent-1",
    agent_type: "Plan",
    cwd: "/path/to/my-project",
    logged_at: now,
  });
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-group-test",
    agent_id: "group-agent-2",
    agent_type: "Explore",
    logged_at: now,
  });

  // Act
  const sessions = getSessions();

  // Assert
  const session = sessions.find((s) => s.id === "session-group-test");
  assertEquals(session?.projectName, "my-project");
  assertEquals(session?.subAgents.length, 2);
});

// =============================================================================
// 複数エージェントのテスト
// =============================================================================

Deno.test("複数エージェント: 同時にactiveになれる", () => {
  // Arrange
  clearSessions();
  const now = new Date().toISOString();
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-multi",
    agent_id: "multi-plan",
    agent_type: "Plan",
    logged_at: now,
  });
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-multi",
    agent_id: "multi-explore",
    agent_type: "Explore",
    logged_at: now,
  });
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-multi",
    agent_id: "multi-bash",
    agent_type: "Bash",
    logged_at: now,
  });

  // Act
  const activeAgents = getActiveAgents();

  // Assert
  const activeIds = activeAgents.map((a) => a.id);
  assertEquals(activeIds.includes("multi-plan"), true);
  assertEquals(activeIds.includes("multi-explore"), true);
  assertEquals(activeIds.includes("multi-bash"), true);
});

Deno.test("複数エージェント: それぞれ異なるツールを使用できる", () => {
  // Arrange
  clearSessions();
  const now = new Date().toISOString();
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-tools",
    agent_id: "tools-agent-1",
    agent_type: "Explore",
    logged_at: now,
  });
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-tools",
    agent_id: "tools-agent-2",
    agent_type: "Bash",
    logged_at: now,
  });

  // Act
  processEvent({
    hook_event_name: "PreToolUse",
    session_id: "session-tools",
    agent_id: "tools-agent-1",
    tool_name: "Grep",
    tool_input: { description: "Searching code" },
    logged_at: now,
  });
  processEvent({
    hook_event_name: "PreToolUse",
    session_id: "session-tools",
    agent_id: "tools-agent-2",
    tool_name: "Bash",
    tool_input: { description: "Running tests" },
    logged_at: now,
  });

  // Assert
  const agents = getAllAgents();
  const agent1 = agents.find((a) => a.id === "tools-agent-1");
  const agent2 = agents.find((a) => a.id === "tools-agent-2");
  assertEquals(agent1?.currentAction, "Searching code");
  assertEquals(agent2?.currentAction, "Running tests");
});
