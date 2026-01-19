/**
 * WebSocket接続管理
 */

import { CONFIG } from "./config.js";
import { clearSessions, setSession } from "./state.js";
import {
  handleEvent,
  handleTitleUpdate,
  handleSpeechUpdate,
} from "./events.js";
import { renderSessions, addEventToLog } from "./render.js";

let statusEl = null;

/**
 * ステータス要素を設定
 * @param {HTMLElement} el
 */
export function setStatusElement(el) {
  statusEl = el;
}

/**
 * WebSocket接続を開始
 */
export function connect() {
  const ws = new WebSocket(`ws://${location.host}/ws`);

  ws.onopen = () => {
    if (statusEl) {
      statusEl.textContent = "connected";
      statusEl.className = "status connected";
    }
  };

  ws.onclose = () => {
    if (statusEl) {
      statusEl.textContent = "disconnected";
      statusEl.className = "status disconnected";
    }
    setTimeout(connect, CONFIG.RECONNECT_DELAY);
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);

      // スナップショット（初期状態）
      if (data.sessions) {
        clearSessions();
        for (const session of data.sessions) {
          session.eventHistory = session.eventHistory || [];
          session.speechHistory = session.speechHistory || [];
          session.subAgents = session.subAgents || [];
          session.conversations = session.conversations || [];
          session.startTime = session.startTime || Date.now();
          setSession(session.id, session);
        }
        renderSessions();
        return;
      }

      // タイトル更新
      if (data.type === "title_update") {
        handleTitleUpdate(data);
        renderSessions();
        return;
      }

      // 発話更新
      if (data.type === "speech_update") {
        handleSpeechUpdate(data);
        renderSessions();
        return;
      }

      // 通常イベント
      handleEvent(data);
      addEventToLog(data);
      renderSessions();
    } catch (err) {
      console.error("Parse error:", err);
    }
  };
}
