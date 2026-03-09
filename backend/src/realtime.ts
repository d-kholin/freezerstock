import { WebSocket, WebSocketServer } from 'ws';

type RealtimeEventType = 'items.changed' | 'history.changed' | 'categories.changed';

type RealtimeSocket = WebSocket & { isAlive?: boolean };

let wsServer: WebSocketServer | null = null;

export function registerRealtimeServer(server: WebSocketServer) {
  wsServer = server;

  server.on('connection', (socket: RealtimeSocket) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('error', () => {
      socket.terminate();
    });
  });

  const interval = setInterval(() => {
    for (const client of server.clients) {
      const socket = client as RealtimeSocket;
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, 30_000);

  server.on('close', () => {
    clearInterval(interval);
  });
}

export function broadcastRealtime(type: RealtimeEventType) {
  if (!wsServer) return;

  const payload = JSON.stringify({ type, at: new Date().toISOString() });
  for (const client of wsServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
