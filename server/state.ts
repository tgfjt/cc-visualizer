/**
 * セッション単位のエージェント状態管理
 */

export interface SubAgent {
  id: string;
  type: string; // Explore, Plan, Bash, etc.
  status: "active" | "inactive";
  currentAction?: string; // description
}

export interface Session {
  id: string;
  projectName: string;
  projectPath: string;
  transcriptPath?: string; // transcriptファイルへのパス
  title?: string; // セッションのタイトル（ユーザーの最新メッセージ）
  speech?: string; // エージェントの最新の発話（冒頭部分）
  currentAction?: string; // メインエージェントの現在のアクション（description）
  currentTool?: string;
  subAgents: Map<string, SubAgent>;
  lastSeen: Date;
}

export interface AgentEvent {
  hook_event_name: string;
  session_id: string;
  cwd?: string;
  transcript_path?: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  tool_input?: {
    description?: string;
    command?: string;
    file_path?: string;
    pattern?: string;
  };
  logged_at: string;
}

// セッション一覧（session_id → Session）
const sessions = new Map<string, Session>();

/**
 * cwdからプロジェクト名を抽出
 */
function extractProjectName(cwd?: string): string {
  if (!cwd) return "unknown";
  const parts = cwd.split("/");
  return parts[parts.length - 1] || parts[parts.length - 2] || "unknown";
}

/**
 * tool_inputからアクション説明を抽出
 */
function extractAction(event: AgentEvent): string | undefined {
  const input = event.tool_input;
  if (!input) return undefined;

  // descriptionがあればそれを使う
  if (input.description) {
    return input.description;
  }

  // なければツール固有の情報から生成
  if (input.file_path) {
    const fileName = input.file_path.split("/").pop();
    return `${fileName} を操作中`;
  }
  if (input.command) {
    const cmd = input.command.slice(0, 50);
    return `コマンド実行: ${cmd}${input.command.length > 50 ? "..." : ""}`;
  }
  if (input.pattern) {
    return `パターン検索: ${input.pattern}`;
  }

  return undefined;
}

/**
 * セッションを取得または作成
 */
function getOrCreateSession(event: AgentEvent): Session {
  let session = sessions.get(event.session_id);
  if (!session) {
    session = {
      id: event.session_id,
      projectName: extractProjectName(event.cwd),
      projectPath: event.cwd || "",
      subAgents: new Map(),
      lastSeen: new Date(event.logged_at),
    };
    sessions.set(event.session_id, session);
  }
  return session;
}

/**
 * イベントを処理してセッション状態を更新
 */
export function processEvent(event: AgentEvent): void {
  const now = new Date(event.logged_at);
  const session = getOrCreateSession(event);
  session.lastSeen = now;

  // プロジェクト名を更新（より正確な情報があれば）
  if (event.cwd && session.projectName === "unknown") {
    session.projectName = extractProjectName(event.cwd);
    session.projectPath = event.cwd;
  }

  // transcriptパスを保存
  if (event.transcript_path && !session.transcriptPath) {
    session.transcriptPath = event.transcript_path;
  }

  switch (event.hook_event_name) {
    case "SubagentStart":
      if (event.agent_id) {
        session.subAgents.set(event.agent_id, {
          id: event.agent_id,
          type: event.agent_type || "unknown",
          status: "active",
        });
      }
      break;

    case "SubagentStop":
      if (event.agent_id) {
        const subAgent = session.subAgents.get(event.agent_id);
        if (subAgent) {
          subAgent.status = "inactive";
          subAgent.currentAction = undefined;
        }
      }
      break;

    case "PreToolUse":
      if (event.agent_id) {
        // サブエージェントのツール使用
        const subAgent = session.subAgents.get(event.agent_id);
        if (subAgent) {
          subAgent.currentAction = extractAction(event);
        }
      } else {
        // メインエージェントのツール使用
        session.currentAction = extractAction(event);
        session.currentTool = event.tool_name;
      }
      break;

    case "PostToolUse":
      if (event.agent_id) {
        const subAgent = session.subAgents.get(event.agent_id);
        if (subAgent) {
          subAgent.currentAction = undefined;
        }
      } else {
        session.currentAction = undefined;
        session.currentTool = undefined;
      }
      break;

    case "SessionEnd":
      // セッション終了時は全サブエージェントをinactiveに
      for (const subAgent of session.subAgents.values()) {
        subAgent.status = "inactive";
        subAgent.currentAction = undefined;
      }
      session.currentAction = undefined;
      session.currentTool = undefined;
      break;
  }

  // 古いセッションをクリーンアップ（10分以上更新なし）
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  for (const [id, s] of sessions) {
    if (s.lastSeen < tenMinutesAgo) {
      sessions.delete(id);
    }
  }
}

/**
 * セッションのタイトルを更新（history.jsonlから）
 */
export function updateSessionTitle(sessionId: string, title: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.title = title;
    session.lastSeen = new Date();
  }
}

/**
 * セッションの発話を更新（transcriptから）
 */
export function updateSessionSpeech(sessionId: string, speech: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.speech = speech;
    session.lastSeen = new Date();
  }
}

/**
 * セッションのtranscriptパスを取得
 */
export function getSessionTranscriptPath(sessionId: string): string | undefined {
  return sessions.get(sessionId)?.transcriptPath;
}

/**
 * セッション一覧を取得（UI用にシリアライズ）
 */
export function getSessions(): Array<{
  id: string;
  projectName: string;
  title?: string;
  speech?: string;
  currentAction?: string;
  subAgents: Array<SubAgent>;
}> {
  return Array.from(sessions.values()).map((s) => ({
    id: s.id,
    projectName: s.projectName,
    title: s.title,
    speech: s.speech,
    currentAction: s.currentAction,
    subAgents: Array.from(s.subAgents.values()),
  }));
}

/**
 * 状態のスナップショットを取得（クライアント初期接続時用）
 */
export function getSnapshot(): { sessions: ReturnType<typeof getSessions> } {
  return {
    sessions: getSessions(),
  };
}

/**
 * セッションをすべてクリア（テスト用）
 */
export function clearSessions(): void {
  sessions.clear();
}

/**
 * 全エージェントを取得
 */
export function getAllAgents(): Array<{
  id: string;
  sessionId: string;
  type: string;
  status: string;
  currentAction?: string;
}> {
  const agents: Array<{
    id: string;
    sessionId: string;
    type: string;
    status: string;
    currentAction?: string;
  }> = [];
  for (const session of sessions.values()) {
    for (const sub of session.subAgents.values()) {
      agents.push({
        id: sub.id,
        sessionId: session.id,
        type: sub.type,
        status: sub.status,
        currentAction: sub.currentAction,
      });
    }
  }
  return agents;
}

/**
 * アクティブなエージェントのみ取得
 */
export function getActiveAgents(): ReturnType<typeof getAllAgents> {
  return getAllAgents().filter((a) => a.status === "active");
}
