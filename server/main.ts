import { tailFile } from "./tail.ts";
import { processEvent, updateSessionTitle, updateSessionSpeech, getSnapshot, type AgentEvent } from "./state.ts";
import { broadcast } from "./broadcast.ts";

const LOG_FILE = Deno.env.get("LOG_FILE") || `${Deno.env.get("HOME")}/.cc-visualizer/events.ndjson`;
const HISTORY_FILE = `${Deno.env.get("HOME")}/.claude/history.jsonl`;
const PORT = Number(Deno.env.get("PORT")) || 8181;
const SPEECH_MAX_LENGTH = 60; // 発話の最大表示文字数

// 接続中のWebSocketクライアント
const clients = new Set<WebSocket>();

// transcriptファイルから最新のassistant発話を取得
async function getLatestSpeech(transcriptPath: string): Promise<string | null> {
  try {
    const content = await Deno.readTextFile(transcriptPath);
    const lines = content.trim().split("\n");

    // 後ろから探して最新のassistant発話を見つける
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === "assistant" && entry.message?.content) {
          for (const block of entry.message.content) {
            if (block.type === "text" && block.text) {
              const text = block.text.trim();
              if (text.length > 0) {
                // 最初の行だけを取得し、長さ制限
                const firstLine = text.split("\n")[0];
                return firstLine.slice(0, SPEECH_MAX_LENGTH) + (firstLine.length > SPEECH_MAX_LENGTH ? "..." : "");
              }
            }
          }
        }
      } catch {
        // パース失敗は無視
      }
    }
  } catch {
    // ファイル読み込み失敗は無視
  }
  return null;
}

// ログファイルをtailしてクライアントに配信
async function startTailing() {
  console.log(`Tailing ${LOG_FILE}...`);

  for await (const line of tailFile(LOG_FILE)) {
    // イベントをパースして状態を更新
    let event: AgentEvent | null = null;
    try {
      event = JSON.parse(line) as AgentEvent;
      processEvent(event);
    } catch {
      // パース失敗は無視
    }

    // 全クライアントに配信
    broadcast(clients, line);

    // transcriptから発話を取得して配信（agent_idがない=メインエージェントの場合のみ）
    if (event?.transcript_path && !event.agent_id) {
      const speech = await getLatestSpeech(event.transcript_path);
      if (speech) {
        updateSessionSpeech(event.session_id, speech);
        broadcast(clients, JSON.stringify({
          type: "speech_update",
          sessionId: event.session_id,
          speech,
        }));
      }
    }
  }
}

// history.jsonlをtailしてセッションタイトルを更新
async function startHistoryTailing() {
  console.log(`Tailing ${HISTORY_FILE}...`);

  for await (const line of tailFile(HISTORY_FILE)) {
    try {
      const entry = JSON.parse(line) as { sessionId: string; display: string };
      if (entry.sessionId && entry.display) {
        updateSessionTitle(entry.sessionId, entry.display);
        // タイトル更新をクライアントに配信
        broadcast(clients, JSON.stringify({
          type: "title_update",
          sessionId: entry.sessionId,
          title: entry.display,
        }));
      }
    } catch {
      // パース失敗は無視
    }
  }
}

// HTTPサーバー（WebSocketアップグレード対応）
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // WebSocket接続
  if (url.pathname === "/ws") {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      clients.add(socket);
      console.log(`Client connected. Total: ${clients.size}`);
      // 現在の状態を送信
      socket.send(JSON.stringify({ type: "snapshot", ...getSnapshot() }));
    };

    socket.onclose = () => {
      clients.delete(socket);
      console.log(`Client disconnected. Total: ${clients.size}`);
    };

    socket.onerror = (e) => {
      console.error("WebSocket error:", e);
      clients.delete(socket);
    };

    return response;
  }

  // ヘルスチェック
  if (url.pathname === "/health") {
    return new Response("ok");
  }

  // CORSプリフライト
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // JS配信
  if (url.pathname.startsWith("/js/")) {
    try {
      const filePath = new URL(`./public${url.pathname}`, import.meta.url);
      const js = await Deno.readTextFile(filePath);
      return new Response(js, {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }

  // index.html配信
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = await Deno.readTextFile(new URL("./public/index.html", import.meta.url));
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response("Not Found", { status: 404 });
}

// サーバー起動
console.log(`Starting server on http://localhost:${PORT}`);
startTailing();
startHistoryTailing();
Deno.serve({ port: PORT }, handleRequest);
