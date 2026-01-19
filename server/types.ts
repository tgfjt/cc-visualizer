/**
 * WebSocketメッセージの型定義
 */

import type { SubAgent } from "./state.ts";

/**
 * セッション情報（クライアント向け）
 */
export interface SessionInfo {
  id: string;
  projectName: string;
  title?: string;
  speech?: string;
  currentAction?: string;
  subAgents: SubAgent[];
}

/**
 * WebSocketで送受信するメッセージ型
 */
export type WSMessage =
  | { type: "snapshot"; sessions: SessionInfo[] }
  | { type: "event"; data: AgentEventData }
  | { type: "speech_update"; sessionId: string; speech: string }
  | { type: "title_update"; sessionId: string; title: string };

/**
 * hook イベントデータ
 */
export interface AgentEventData {
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
    subagent_type?: string;
  };
  logged_at: string;
}
