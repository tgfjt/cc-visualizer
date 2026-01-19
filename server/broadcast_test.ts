import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { broadcast } from "./broadcast.ts";

// =============================================================================
// broadcast のテスト
// =============================================================================

Deno.test("broadcast: 接続中のクライアントにのみ送信される", () => {
  // Arrange
  const sent: string[] = [];
  const openClient = {
    readyState: WebSocket.OPEN,
    send: (msg: string) => sent.push(msg),
  };
  const closedClient = {
    readyState: WebSocket.CLOSED,
    send: (msg: string) => sent.push(msg),
  };

  // Act
  broadcast([openClient, closedClient] as unknown as WebSocket[], "テストメッセージ");

  // Assert
  assertEquals(sent, ["テストメッセージ"]);
});

Deno.test("broadcast: 複数の接続中クライアントに送信される", () => {
  // Arrange
  const sent1: string[] = [];
  const sent2: string[] = [];
  const client1 = {
    readyState: WebSocket.OPEN,
    send: (msg: string) => sent1.push(msg),
  };
  const client2 = {
    readyState: WebSocket.OPEN,
    send: (msg: string) => sent2.push(msg),
  };

  // Act
  broadcast([client1, client2] as unknown as WebSocket[], "ブロードキャスト");

  // Assert
  assertEquals(sent1, ["ブロードキャスト"]);
  assertEquals(sent2, ["ブロードキャスト"]);
});

Deno.test("broadcast: クライアントがない場合もエラーにならない", () => {
  // Arrange
  const clients: WebSocket[] = [];

  // Act & Assert（エラーが出ないこと）
  broadcast(clients, "誰もいない");
  // エラーが出なければテスト成功
});

Deno.test("broadcast: CONNECTING状態のクライアントには送信されない", () => {
  // Arrange
  const sent: string[] = [];
  const connectingClient = {
    readyState: WebSocket.CONNECTING,
    send: (msg: string) => sent.push(msg),
  };

  // Act
  broadcast([connectingClient] as unknown as WebSocket[], "まだ接続中");

  // Assert
  assertEquals(sent, []);
});

Deno.test("broadcast: CLOSING状態のクライアントには送信されない", () => {
  // Arrange
  const sent: string[] = [];
  const closingClient = {
    readyState: WebSocket.CLOSING,
    send: (msg: string) => sent.push(msg),
  };

  // Act
  broadcast([closingClient] as unknown as WebSocket[], "閉じかけ");

  // Assert
  assertEquals(sent, []);
});
