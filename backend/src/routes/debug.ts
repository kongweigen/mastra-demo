import { Hono } from 'hono'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { mastra } from '../mastra/index.js'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { UIMessage } from 'ai'

export const debugRoute = new Hono()

/** Skills 目录 — mastra dev 使用 public/workspace，兼容两种启动方式 */
const SKILLS_DIR = resolve(process.cwd(), 'src/mastra/public/workspace/.agents/skills')

// ─── Agent Instructions ─────────────────────────────────

/** 读取指定 agent 的 instructions */
debugRoute.get('/api/debug/agent/:id/instructions', async (c) => {
    const agentId = c.req.param('id')
    const agent = mastra.getAgent(agentId as any)
    if (!agent) {
        return c.json({ error: `Agent "${agentId}" not found` }, 404)
    }

    // Agent 的 instructions 可能是 string | string[] | SystemMessage | function
    const raw = (agent as any).instructions
    let text: string
    if (typeof raw === 'function') {
        text = '[dynamic function — cannot display]'
    } else if (typeof raw === 'string') {
        text = raw
    } else if (Array.isArray(raw)) {
        text = raw.join('\n')
    } else if (raw && typeof raw === 'object' && 'content' in raw) {
        text = String(raw.content)
    } else {
        text = JSON.stringify(raw)
    }

    return c.json({ agentId, instructions: text })
})

// ─── Skill Read/Write ───────────────────────────────────

/** 列出所有 skill 名称 */
debugRoute.get('/api/debug/skills', async (c) => {
    try {
        const entries = await readdir(SKILLS_DIR, { withFileTypes: true })
        const skills = entries
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort()
        return c.json({ skills })
    } catch {
        return c.json({ skills: [] })
    }
})

/** 读取单个 skill 的 SKILL.md 内容 */
debugRoute.get('/api/debug/skill/:name', async (c) => {
    const name = c.req.param('name')
    const skillFile = join(SKILLS_DIR, name, 'SKILL.md')
    try {
        const content = await readFile(skillFile, 'utf-8')
        return c.json({ name, content })
    } catch {
        return c.json({ error: `Skill "${name}" not found` }, 404)
    }
})

/** 写入单个 skill 的 SKILL.md 内容 */
debugRoute.put('/api/debug/skill/:name', async (c) => {
    const name = c.req.param('name')
    const { content } = await c.req.json<{ content: string }>()
    const skillFile = join(SKILLS_DIR, name, 'SKILL.md')
    try {
        await writeFile(skillFile, content, 'utf-8')
        return c.json({ ok: true })
    } catch (err) {
        return c.json({ error: `Failed to write skill "${name}": ${err}` }, 500)
    }
})

// ─── Debug Chat (with instructions override) ────────────

/** 扩展版 chat 端点，支持 instructionsOverride */
debugRoute.post('/api/debug/chat', async (c) => {
    const body = await c.req.json()
    const { messages, agentId = 'router', instructionsOverride, resourceId, threadId } = body

    const agent = mastra.getAgent(agentId as any)
    if (!agent) {
        return c.json({ error: `Agent "${agentId}" not found` }, 404)
    }

    const last = messages[messages.length - 1]
    const lastText =
        typeof last?.content === 'string'
            ? last.content
            : Array.isArray(last?.parts)
              ? last.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
              : JSON.stringify(last?.content ?? '')
    const preview = lastText.slice(0, 120) + (lastText.length > 120 ? '…' : '')

    console.log(
        `[debug.ts] 📨 调试请求 → agent="${agentId}" messages=${messages.length}` +
        (instructionsOverride ? ' [instructions overridden]' : '') +
        `\n[debug.ts] 💬 用户消息 → ${preview}`,
    )

    const streamOptions: Record<string, any> = {}
    if (resourceId && threadId) {
        streamOptions.memory = { resource: resourceId, thread: threadId }
    }
    if (instructionsOverride) {
        streamOptions.instructions = instructionsOverride
    }

    const stream = await agent.stream(messages, streamOptions)

    const uiStream = createUIMessageStream({
        originalMessages: messages as UIMessage[],
        execute: async ({ writer }) => {
            const aiStream = toAISdkStream(stream, {
                from: 'agent',
                sendReasoning: true,
                sendSources: true,
            })

            if (aiStream && typeof (aiStream as any).getReader === 'function') {
                const reader = (aiStream as ReadableStream<any>).getReader()
                try {
                    while (true) {
                        const { value, done } = await reader.read()
                        if (done) break
                        await writer.write(value)
                    }
                } finally {
                    reader.releaseLock?.()
                }
            } else if (aiStream && Symbol.asyncIterator in aiStream) {
                for await (const part of aiStream as AsyncIterable<any>) {
                    await writer.write(part)
                }
            }

            console.log(`[debug.ts] 🏁 流结束 ← agent="${agentId}"`)
        },
        onError: (err) => {
            console.error(`[debug.ts] ❌ 流错误 ← agent="${agentId}"`, err)
            return err instanceof Error ? err.message : String(err)
        },
    })

    return createUIMessageStreamResponse({ stream: uiStream })
})
