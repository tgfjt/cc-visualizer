import { tailFile } from "./tail.ts";

const LOG_FILE = `${Deno.env.get("HOME")}/.cc-visualizer/events.ndjson`;
const PORT = 8181;

// 接続中のWebSocketクライアント
const clients = new Set<WebSocket>();

// ログファイルをtailしてクライアントに配信
async function startTailing() {
  console.log(`Tailing ${LOG_FILE}...`);

  for await (const line of tailFile(LOG_FILE)) {
    // 全クライアントに配信
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(line);
      }
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
Deno.serve({ port: PORT }, handleRequest);
