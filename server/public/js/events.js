/**
 * イベント処理
 */

import { CONFIG } from "./config.js";
import { getSession, setSession } from "./state.js";
import { extractAction, extractProjectName, getToolIcon } from "./utils.js";

/**
 * 会話を追加
 * @param {object} session
 * @param {string} from
 * @param {string|null} to
 * @param {string} message
 */
export function addConversation(session, from, to, message) {
  if (!session.conversations) session.conversations = [];
  session.conversations.push({
    from,
    to,
    message,
    time: Date.now(),
  });
  if (session.conversations.length > CONFIG.MAX_CONVERSATIONS) {
    session.conversations.shift();
  }
}

// handleSnapshot は websocket.js で直接処理するため不要

/**
 * タイトル更新を処理
 * @param {object} data
 */
export function handleTitleUpdate(data) {
  const session = getSession(data.sessionId);
  if (session) {
    session.title = data.title;
    session.lastSeen = Date.now();
  }
}

/**
 * 発話更新を処理
 * @param {object} data
 */
export function handleSpeechUpdate(data) {
  const session = getSession(data.sessionId);
  if (session) {
    if (!session.speechHistory) {
      session.speechHistory = [];
    }
    const lastSpeech = session.speechHistory[0];
    if (!lastSpeech || lastSpeech.text !== data.speech) {
      session.speechHistory.unshift({
        text: data.speech,
        time: Date.now(),
      });
      if (session.speechHistory.length > CONFIG.MAX_SPEECH_HISTORY) {
        session.speechHistory.pop();
      }
    }
    session.lastSeen = Date.now();
  }
}

/**
 * 通常イベントを処理
 * @param {object} event
 */
export function handleEvent(event) {
  const sessionId = event.session_id;
  if (!sessionId) return;

  let session = getSession(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      projectName: extractProjectName(event.cwd),
      subAgents: [],
      eventHistory: [],
      conversations: [],
      startTime: Date.now(),
      lastSeen: Date.now(),
    };
    setSession(sessionId, session);
  }
  session.lastSeen = Date.now();

  // イベント履歴に追加
  if (event.hook_event_name) {
    if (!session.eventHistory) session.eventHistory = [];
    session.eventHistory.push({
      type: event.hook_event_name,
      tool: event.tool_name,
      agentId: event.agent_id,
      agentType: event.agent_type,
      description: event.tool_input?.description,
      time: Date.now(),
    });
    if (session.eventHistory.length > CONFIG.MAX_EVENT_HISTORY) {
      session.eventHistory.shift();
    }
  }

  switch (event.hook_event_name) {
    case "SubagentStart":
      if (event.agent_id) {
        let sub = session.subAgents.find((s) => s.id === event.agent_id);
        if (!sub) {
          sub = {
            id: event.agent_id,
            type: event.agent_type || "unknown",
            status: "active",
          };
          session.subAgents.push(sub);
        } else {
          sub.status = "active";
          sub.type = event.agent_type || sub.type;
        }
      }
      break;

    case "SubagentStop":
      if (event.agent_id) {
        const sub = session.subAgents.find((s) => s.id === event.agent_id);
        if (sub) {
          addConversation(session, sub.type, "main", "完了");
          sub.status = "inactive";
          sub.currentAction = null;
        }
      }
      break;

    case "PreToolUse": {
      const action = extractAction(event);
      if (event.agent_id) {
        const sub = session.subAgents.find((s) => s.id === event.agent_id);
        if (sub && action) {
          sub.currentAction = action;
          sub.actionTime = Date.now();
        }
      } else {
        if (action) {
          session.currentAction = action;
          session.actionTime = Date.now();
        }
        const toolName = event.tool_name;
        if (toolName === "Task" && event.tool_input) {
          const subType = event.tool_input.subagent_type || "サブ";
          const desc = event.tool_input.description || "作業依頼";
          addConversation(session, "main", subType, desc);
        } else if (toolName && action) {
          const toolIcon = getToolIcon(toolName);
          addConversation(session, "main", null, `${toolIcon} ${action}`);
        }
      }
      break;
    }

    case "PostToolUse":
      // アクションは残す
      break;

    case "SessionEnd":
      session.ended = true;
      session.currentAction = null;
      session.subAgents.forEach((s) => {
        s.status = "inactive";
        s.currentAction = null;
      });
      break;
  }
}
