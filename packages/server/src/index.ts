import express from 'express';
import cors from 'cors';
import { projectsRouter } from './routes/projects.js';
import { phasesRouter } from './routes/phases.js';
import { settingsRouter } from './routes/settings.js';
import { studioRouter } from './routes/studio.js';
import { sseRouter } from './routes/sse.js';
import { runPhase } from './agent-service.js';
import { logWorkspaceSkillsStatus } from './lib/mastra.js';
import { listManagedAgents } from './lib/studio-config.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/projects', projectsRouter);
app.use('/api/phases', phasesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/studio', studioRouter);
app.use('/api/sse', sseRouter);

// 运行阶段
app.post('/api/projects/:id/run', async (req, res) => {
  try {
    const { phase } = req.body;
    const projectId = req.params.id;

    if (!phase || ![1, 2, 3].includes(phase)) {
      return res.status(400).json({ error: 'Invalid phase number' });
    }

    // 异步执行，不等待完成
    runPhase(projectId, phase).catch(console.error);

    res.json({ status: 'started', phase });
  } catch (error) {
    console.error('Error starting phase:', error);
    res.status(500).json({ error: 'Failed to start phase' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  logWorkspaceSkillsStatus('server-startup');
  listManagedAgents()
    .then((agents) => {
      console.info(
        `[Studio][server-startup] managedAgents=${agents.length} keys=${agents.map((agent) => `${agent.key}:${agent.phaseNumber ?? 'custom'}`).join(', ')}`
      );
    })
    .catch((error) => {
      console.error('[Studio][server-startup] failed to inspect managed agents', error);
    });
});

export { app };
