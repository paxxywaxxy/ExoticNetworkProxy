const http = require("http");
const WebSocket = require("ws");
const PORT = Number(process.env.PORT || 10000);
const UPSTREAM_URL = process.env.UPSTREAM_URL;

if (!UPSTREAM_URL || !(UPSTREAM_URL.startsWith("ws://") || UPSTREAM_URL.startsWith("wss://"))) {
  console.error("Set UPSTREAM_URL, e.g. ws://exoticnetwork.pracc.club:17170/");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, {"content-type":"text/plain; charset=utf-8"});
  res.end(req.url === "/health" || req.url === "/" ? "Eagler WebSocket proxy is running\\n" : "Not found\\n");
});
const wss = new WebSocket.Server({noServer:true, perMessageDeflate:false});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, client => wss.emit("connection", client, req));
});

wss.on("connection", (client, req) => {
  console.log("Incoming WebSocket:", req.url);
  const upstream = new WebSocket(UPSTREAM_URL, {perMessageDeflate:false, handshakeTimeout:15000});
  const pending = [];
  let pendingBytes = 0;
  let ended = false;

  client.on("message", (data, binary) => {
    if (ended) return;
    if (upstream.readyState === WebSocket.OPEN) upstream.send(data, {binary});
    else if (upstream.readyState === WebSocket.CONNECTING) {
      const size = data.length || data.byteLength || 0;
      if (pendingBytes + size > 1048576) {
        client.close(1009, "Too much early data");
        upstream.terminate();
        return;
      }
      pending.push([data, binary]);
      pendingBytes += size;
    }
  });
  upstream.on("open", () => {
    console.log("Connected to EaglerXPaper upstream");
    for (const [data, binary] of pending) if (client.readyState === WebSocket.OPEN) upstream.send(data, {binary});
    pending.length = 0;
    pendingBytes = 0;
  });
  upstream.on("message", (data, binary) => {
    if (client.readyState === WebSocket.OPEN) client.send(data, {binary});
  });
  upstream.on("error", err => {
    console.error("Upstream WebSocket error:", err.message);
    if (client.readyState === WebSocket.OPEN) client.close(1011, "Upstream unavailable");
  });
  client.on("error", err => console.error("Client WebSocket error:", err.message));
  client.on("close", () => { ended = true; if (upstream.readyState !== WebSocket.CLOSED) upstream.close(); });
  upstream.on("close", (code, reason) => {
    console.log("Upstream closed:", code, reason.toString());
    if (client.readyState === WebSocket.OPEN) client.close(1011, "Upstream closed");
  });
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy listening on 0.0.0.0:${PORT}`);
  console.log(`Upstream: ${UPSTREAM_URL}`);
});
