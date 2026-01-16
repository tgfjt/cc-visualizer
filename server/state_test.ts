import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  processEvent,
  getActiveAgents,
  getAllAgents,
  getSnapshot,
  getSessions,
  type AgentEvent,
} from "./state.ts";

Deno.test("SubagentStart でエージェントが追加される", () => {
  const event: AgentEvent = {
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-001",
    agent_type: "Explore",
    cwd: "/path/to/project",
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
  processEvent({
    hook_event_name: "SubagentStart",
    session_id: "session-1",
    agent_id: "agent-002",
    agent_type: "Bash",
    logged_at: new Date().toISOString(),
  });

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
    tool_input: { description: "Reading file" },
    logged_at: new Date().toISOString(),
  });

  const agents = getAllAgents();
  const agent = agents.find((a) => a.id === "agent-003");

  assertEquals(agent?.currentTool, "Reading file");
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
    tool_input: { description: "Running command" },
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

  const activeAgents = getActiveAgents();
  const activeIds = activeAgents.map((a) => a.id);

  assertEquals(activeIds.includes("active-agent"), true);
  assertEquals(activeIds.includes("inactive-agent"), false);
});

Deno.test("getSnapshot は sessions を含む", () => {
  const snapshot = getSnapshot();

  assertEquals(Array.isArray(snapshot.sessions), true);
});

Deno.test("getSessions はセッション単位でグルーピングする", () => {
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

  const sessions = getSessions();
  const session = sessions.find((s) => s.id === "session-group-test");

  assertEquals(session?.projectName, "my-project");
  assertEquals(session?.subAgents.length, 2);
});

Deno.test("複数エージェントが同時に active になれる", () => {
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

  const activeAgents = getActiveAgents();
  const activeIds = activeAgents.map((a) => a.id);

  assertEquals(activeIds.includes("multi-plan"), true);
  assertEquals(activeIds.includes("multi-explore"), true);
  assertEquals(activeIds.includes("multi-bash"), true);
});

Deno.test("複数エージェントがそれぞれ異なるツールを使用できる", () => {
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

  const agents = getAllAgents();
  const agent1 = agents.find((a) => a.id === "tools-agent-1");
  const agent2 = agents.find((a) => a.id === "tools-agent-2");

  assertEquals(agent1?.currentTool, "Searching code");
  assertEquals(agent2?.currentTool, "Running tests");
});
