import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { chatRoute } from './routes/chat.js'
import { skillsRoute } from './routes/skills.js'
import { agentsRoute } from './routes/agents.js'
import { debugRoute } from './routes/debug.js'

const app = new Hono()

app.use('*', cors())

app.route('/', chatRoute)
app.route('/', skillsRoute)
app.route('/', agentsRoute)
app.route('/', debugRoute)

app.get('/', (c) => c.json({ name: 'agent-demo-backend', status: 'ok' }))

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
    console.log(`\n🚀 Backend running at http://localhost:${port}`)
    console.log(`   POST /api/chat    — 智能体对话 (SSE streaming)`)
    console.log(`   GET  /api/agents  — 智能体列表`)
    console.log(`   GET  /api/skills  — 技能列表`)
    console.log(`   *    /api/debug/* — 调试工具 API\n`)
})
