import { WebSocketServer } from "ws";
const server = new WebSocketServer({ port: 8080 });

const clients = new Map(); 
const usernames = new Set();

server.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (err) {
      return;
    }

    if (msg.type === 'register') {
      if (usernames.has(msg.username)) {
        ws.send(JSON.stringify({ type: 'reject', reason: 'Ism band' }));
        return;
      }

      clients.set(ws, msg.username);
      usernames.add(msg.username);
      ws.send(JSON.stringify({ type: 'accept', message: 'Ism qabul qilindi' }));
      return;
    }

    if (msg.type === 'message' || msg.type === 'file' || msg.type === 'typing') {
      const username = clients.get(ws);
      if (!username) return;

      msg.username = username; 
      const json = JSON.stringify(msg);

      for (const [client] of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(json);
        }
      }
    }
  });

  ws.on('close', () => {
    const name = clients.get(ws);
    if (name) usernames.delete(name);
    clients.delete(ws);
  });
});

console.log('Server ishlayapti: ws://localhost:8080');
