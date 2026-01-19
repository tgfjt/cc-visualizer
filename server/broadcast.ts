/**
 * WebSocketクライアントへの配信ユーティリティ
 */

/**
 * 接続中の全クライアントにメッセージを配信
 */
export function broadcast(
  clients: Iterable<WebSocket>,
  message: string
): void {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
