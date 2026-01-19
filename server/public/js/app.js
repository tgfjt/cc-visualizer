/**
 * アプリケーションエントリーポイント
 */

import { setElements, renderSessions } from "./render.js";
import { setStatusElement, connect } from "./websocket.js";

// DOM読み込み完了後に初期化
document.addEventListener("DOMContentLoaded", () => {
  // DOM要素を取得して設定
  const sessionsEl = document.getElementById("sessions");
  const eventsEl = document.getElementById("events");
  const statusEl = document.getElementById("status");

  setElements(sessionsEl, eventsEl);
  setStatusElement(statusEl);

  // WebSocket接続開始
  connect();

  // 定期的にUIを更新（フェードアウト反映）
  setInterval(renderSessions, 2000);
});
