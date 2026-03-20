import { Hono } from 'hono'
import { mastra } from '../mastra/index.js'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { UIMessage } from 'ai'

export const chatRoute = new Hono()

chatRoute.post('/api/chat', async (c) => {
    const body = await c.req.json()
    const { messages, agentId = 'router', resourceId, threadId } = body

    const agent = mastra.getAgent(agentId)
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
        `[chat.ts:18] 📨 请求 → agent="${agentId}" messages=${messages.length}\n` +
        `[chat.ts:19] 💬 用户消息 → ${preview}`,
    )

    const stream = await agent.stream(messages, {
        memory: resourceId && threadId ? { resource: resourceId, thread: threadId } : undefined,
    })

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

            console.log(`[chat.ts:48] 🏁 流结束 ← agent="${agentId}"`)
        },
        onError: (err) => {
            console.error(`[chat.ts:50] ❌ 流错误 ← agent="${agentId}"`, err)
            return err instanceof Error ? err.message : String(err)
        },
    })

    return createUIMessageStreamResponse({ stream: uiStream })
})
