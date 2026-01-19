/**
 * ユーティリティ関数
 */

import { TOOL_ICONS } from "./config.js";

/**
 * タイムスタンプをHH:MM形式にフォーマット
 * @param {number} timestamp
 * @returns {string}
 */
export function formatTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

/**
 * イベントからアクション説明を抽出
 * @param {object} event
 * @returns {string|null}
 */
export function extractAction(event) {
  const input = event.tool_input;
  if (!input) return null;

  if (input.description) {
    return input.description;
  }
  if (input.file_path) {
    const fileName = input.file_path.split("/").pop();
    return `${fileName} を操作中`;
  }
  if (input.command) {
    const cmd = input.command.slice(0, 60);
    return cmd + (input.command.length > 60 ? "..." : "");
  }
  if (input.pattern) {
    return `検索: ${input.pattern}`;
  }
  return null;
}

/**
 * cwdからプロジェクト名を抽出
 * @param {string|null|undefined} cwd
 * @returns {string}
 */
export function extractProjectName(cwd) {
  if (!cwd) return "unknown";
  const parts = cwd.split("/");
  return parts[parts.length - 1] || "unknown";
}

/**
 * ツール名からアイコンを取得
 * @param {string} toolName
 * @returns {string}
 */
export function getToolIcon(toolName) {
  return TOOL_ICONS[toolName] || "🔧";
}
