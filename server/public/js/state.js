/**
 * セッション状態管理
 */

// セッション状態
const sessions = new Map();

/**
 * セッションを取得
 * @param {string} id
 * @returns {object|undefined}
 */
export function getSession(id) {
  return sessions.get(id);
}

/**
 * セッションを設定
 * @param {string} id
 * @param {object} session
 */
export function setSession(id, session) {
  sessions.set(id, session);
}

/**
 * セッションを削除
 * @param {string} id
 */
export function deleteSession(id) {
  sessions.delete(id);
}

/**
 * 全セッションを取得
 * @returns {object[]}
 */
export function getAllSessions() {
  return Array.from(sessions.values());
}

/**
 * セッションをすべてクリア
 */
export function clearSessions() {
  sessions.clear();
}

/**
 * セッション数を取得
 * @returns {number}
 */
export function getSessionCount() {
  return sessions.size;
}
