import { Router } from 'express';

export const sseRouter = Router();

// SSE 客户端存储
const clients = new Map<string, Set<(data: string) => void>>();

export function addClient(projectId: string, callback: (data: string) => void): void {
  if (!clients.has(projectId)) {
    clients.set(projectId, new Set());
  }
  clients.get(projectId)!.add(callback);
}

export function removeClient(projectId: string, callback: (data: string) => void): void {
  const projectClients = clients.get(projectId);
  if (projectClients) {
    projectClients.delete(callback);
    if (projectClients.size === 0) {
      clients.delete(projectId);
    }
  }
}

export function emitEvent(projectId: string, event: object): void {
  const projectClients = clients.get(projectId);
  if (projectClients) {
    const data = JSON.stringify(event);
    projectClients.forEach((callback) => {
      callback(data);
    });
  }
}

// SSE 端点
sseRouter.get('/:projectId', (req, res) => {
  const { projectId } = req.params;

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const callback = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  addClient(projectId, callback);

  // 客户端断开连接时清理
  req.on('close', () => {
    removeClient(projectId, callback);
    res.end();
  });
});
