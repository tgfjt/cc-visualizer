/**
 * UI描画
 */

import { CONFIG } from "./config.js";
import { getAllSessions } from "./state.js";
import { formatTime } from "./utils.js";

let sessionsEl = null;
let eventsEl = null;

/**
 * DOM要素を設定
 * @param {HTMLElement} sessions
 * @param {HTMLElement} events
 */
export function setElements(sessions, events) {
  sessionsEl = sessions;
  eventsEl = events;
}

/**
 * セッション一覧を描画
 */
export function renderSessions() {
  if (!sessionsEl) return;

  const oneMinuteAgo = Date.now() - CONFIG.SESSION_ENDED_TIMEOUT;
  const thirtyMinutesAgo = Date.now() - CONFIG.SESSION_IDLE_TIMEOUT;
  const activeSessions = getAllSessions()
    .filter((session) => {
      if (session.ended) {
        return session.lastSeen > oneMinuteAgo;
      }
      return session.lastSeen > thirtyMinutesAgo;
    })
    .sort((a, b) => b.lastSeen - a.lastSeen);

  if (activeSessions.length === 0) {
    sessionsEl.innerHTML =
      '<div class="no-sessions">アクティブなセッションなし</div>';
    return;
  }

  sessionsEl.innerHTML = `<div class="chat-container">
    ${activeSessions
      .map((session) => {
        const isRecent = session.lastSeen > Date.now() - 60 * 1000;
        const shortId = session.id.slice(0, 7);
        const conversations = session.conversations || [];

        return `
        <div class="chat-session${isRecent ? "" : " idle"}">
          <div class="chat-header">
            <span class="project">${session.projectName}</span>
            <span class="session-id">${shortId}</span>
            ${session.title ? `<span class="title">${session.title}</span>` : ""}
          </div>
          <div class="chat-messages">
            ${
              conversations.length > 0
                ? conversations
                    .map((c) => {
                      const time = formatTime(c.time);
                      const isFromMain = c.from === "main";
                      const sender = isFromMain ? "💁" : c.from;
                      const mention =
                        c.to && c.to !== "main" ? `@${c.to}` : "";
                      const isReply = !isFromMain;

                      return `<div class="chat-message${isReply ? " reply" : ""}">
                      <span class="time">${time}</span>
                      <span class="sender ${isFromMain ? "main" : "sub"}">${sender}:</span>
                      ${mention ? `<span class="mention">${mention}</span>` : ""}
                      <span class="text">${c.message}</span>
                    </div>`;
                    })
                    .join("")
                : '<div class="chat-empty">待機中...</div>'
            }
          </div>
        </div>
      `;
      })
      .join("")}
  </div>`;
}

/**
 * イベントログに追加
 * @param {object} event
 */
export function addEventToLog(event) {
  if (!eventsEl) return;

  const el = document.createElement("div");
  el.className = "event";
  const time = new Date(event.logged_at).toLocaleTimeString();
  let desc = event.tool_input?.description;
  if (!desc && event.tool_name) {
    desc = event.tool_name;
  }
  if (!desc) {
    desc = event.hook_event_name;
  }
  el.textContent = `${time} ${desc}`;
  eventsEl.insertBefore(el, eventsEl.firstChild);

  while (eventsEl.children.length > CONFIG.MAX_EVENTS) {
    eventsEl.removeChild(eventsEl.lastChild);
  }
}
