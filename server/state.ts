/**
 * エージェント状態管理
 */

export interface Agent {
  id: string;
  sessionId: string;
  type: string;
  status: "active" | "inactive";
  currentTool?: string;
  lastSeen: Date;
}

export interface AgentEvent {
  hook_event_name: string;
  session_id: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  tool_input?: {
    description?: string;
    command?: string;
  };
  logged_at: string;
}

// エージェント一覧（agent_id → Agent）
const agents = new Map<string, Agent>();

// セッション一覧（session_id → 最終アクティブ時刻）
const sessions = new Map<string, Date>();

/**
 * イベントを処理してエージェント状態を更新
 */
export function processEvent(event: AgentEvent): void {
  const now = new Date(event.logged_at);

  // セッション更新
  sessions.set(event.session_id, now);

  switch (event.hook_event_name) {
    case "SubagentStart":
      if (event.agent_id) {
        agents.set(event.agent_id, {
          id: event.agent_id,
          sessionId: event.session_id,
          type: event.agent_type || "unknown",
          status: "active",
          lastSeen: now,
        });
      }
      break;

    case "SubagentStop":
      if (event.agent_id) {
        const agent = agents.get(event.agent_id);
        if (agent) {
          agent.status = "inactive";
          agent.currentTool = undefined;
          agent.lastSeen = now;
        }
      }
      break;

    case "PreToolUse":
      // ツール使用中のエージェントを更新（メインエージェント）
      // agent_idがない場合はセッションIDをキーにする
      const toolAgentId = event.agent_id || `main-${event.session_id}`;
      let toolAgent = agents.get(toolAgentId);
      if (!toolAgent) {
        toolAgent = {
          id: toolAgentId,
          sessionId: event.session_id,
          type: "main",
          status: "active",
          lastSeen: now,
        };
        agents.set(toolAgentId, toolAgent);
      }
      toolAgent.currentTool = event.tool_name;
      toolAgent.lastSeen = now;
      break;

    case "PostToolUse":
      const postAgentId = event.agent_id || `main-${event.session_id}`;
      const postAgent = agents.get(postAgentId);
      if (postAgent) {
        postAgent.currentTool = undefined;
        postAgent.lastSeen = now;
      }
      break;

    case "SessionEnd":
      // セッション終了時、関連するエージェントをinactiveに
      for (const agent of agents.values()) {
        if (agent.sessionId === event.session_id) {
          agent.status = "inactive";
          agent.currentTool = undefined;
        }
      }
      break;
  }

  // 古いエージェントをクリーンアップ（5分以上更新なし）
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  for (const [id, agent] of agents) {
    if (agent.lastSeen < fiveMinutesAgo) {
      agents.delete(id);
    }
  }
}

/**
 * アクティブなエージェント一覧を取得
 */
export function getActiveAgents(): Agent[] {
  return Array.from(agents.values()).filter((a) => a.status === "active");
}

/**
 * 全エージェント一覧を取得
 */
export function getAllAgents(): Agent[] {
  return Array.from(agents.values());
}

/**
 * 状態のスナップショットを取得（クライアント初期接続時用）
 */
export function getSnapshot(): { agents: Agent[] } {
  return {
    agents: getAllAgents(),
  };
}
