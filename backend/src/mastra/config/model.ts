import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { wrapLanguageModel, type LanguageModelMiddleware } from 'ai'

/* ────────────── SSE 流适配器 ──────────────
 * 解决 doubao 模型两个兼容性问题：
 * 1. SSE 行断裂：`data:\n  {json}` 被拆成两行，标准应为 `data: {json}`
 * 2. reasoning_content：思考链放在 delta.reasoning_content 而非标准字段
 *    → 转为 <think>…</think> 标签嵌入 content，前端可解析并折叠展示
 * ─────────────────────────────────────────── */

const adaptFetch: typeof globalThis.fetch = async (input, init) => {
    const res = await globalThis.fetch(input, init)

    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/event-stream') || !res.body) return res

    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let buffer = ''
    let inReasoning = false

    const transform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true })
            const parts = buffer.split('\n')
            // 最后一段可能不完整，留在 buffer
            buffer = parts.pop() ?? ''

            const pendingLines: string[] = []

            for (const raw of parts) {
                const line = raw.trim()

                // 空行 → SSE 事件分隔符，直接透传
                if (line.length === 0) {
                    pendingLines.push('')
                    continue
                }

                // 孤立的 `data:` 行 → 与下一行合并（doubao 的断行问题）
                if (line === 'data:') {
                    // 把 "data:" 前缀存入 buffer，等下一行 JSON 来合并
                    buffer = 'data: ' + buffer
                    continue
                }

                // 非 data 行（如 event:, id:, :comment）直接透传
                if (!line.startsWith('data:')) {
                    pendingLines.push(line)
                    continue
                }

                // data: [DONE]
                const jsonStr = line.slice(5).trim()
                if (jsonStr === '[DONE]') {
                    // 若还在思考中，先关闭 <think> 标签
                    if (inReasoning) {
                        inReasoning = false
                        // 发一个关闭标签的 chunk
                        const closeChunk = buildContentOnlyChunk('</think>\n')
                        pendingLines.push(`data: ${closeChunk}`)
                        pendingLines.push('')
                    }
                    pendingLines.push(line)
                    continue
                }

                // 解析 JSON 并转换 reasoning_content
                let parsed: any
                try {
                    parsed = JSON.parse(jsonStr)
                } catch {
                    // JSON 解析失败 → 跳过这行，避免下游崩溃
                    continue
                }

                const delta = parsed?.choices?.[0]?.delta
                if (!delta) {
                    pendingLines.push(`data: ${JSON.stringify(parsed)}`)
                    continue
                }

                const reasoning = delta.reasoning_content ?? ''
                const content = delta.content ?? ''

                // 移除非标准字段，避免下游解析出错
                delete delta.reasoning_content

                if (reasoning) {
                    if (!inReasoning) {
                        // 开始思考 → 注入 <think> 开标签
                        inReasoning = true
                        delta.content = '<think>' + reasoning
                    } else {
                        delta.content = reasoning
                    }
                } else if (content && inReasoning) {
                    // 思考结束，正文开始 → 注入 </think> 关标签
                    inReasoning = false
                    delta.content = '</think>\n' + content
                }
                // content 非空且不在 reasoning → 正常透传（delta.content 已有值）

                pendingLines.push(`data: ${JSON.stringify(parsed)}`)
            }

            if (pendingLines.length > 0) {
                controller.enqueue(encoder.encode(pendingLines.join('\n') + '\n'))
            }
        },

        flush(controller) {
            // 处理 buffer 中残留数据
            if (buffer.trim().length > 0) {
                controller.enqueue(encoder.encode(buffer + '\n'))
            }
        },
    })

    return new Response(res.body.pipeThrough(transform), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
    })
}

/** 构造一个仅包含 content 的最小 SSE JSON chunk */
function buildContentOnlyChunk(text: string): string {
    return JSON.stringify({
        choices: [{ delta: { content: text, role: 'assistant' }, index: 0 }],
        object: 'chat.completion.chunk',
    })
}

const provider = createOpenAICompatible({
    name: 'chatfire',
    baseURL: process.env.LLM_BASE_URL ?? 'https://api.chatfire.site/v1',
    apiKey: process.env.LLM_API_KEY ?? '',
    fetch: adaptFetch,
})

const baseModel = provider(process.env.LLM_MODEL ?? 'gemini-3-flash-preview')

/* ────────────── LLM 请求日志中间件 ────────────── */

const LOG_ENABLED = process.env.LLM_LOG !== '0'
const LOG_TAG = '[model.ts]'

/** 请求轮次计数器（同一次 chat 请求中的多轮 LLM 调用） */
let roundCounter = 0
let lastRequestTime = 0

/** 将 prompt 消息格式化为可读日志（完整输出，不截断） */
function formatPromptForLog(prompt: any[]): string {
    const lines: string[] = []
    for (const msg of prompt) {
        const role = msg.role?.toUpperCase() ?? '???'
        if (msg.role === 'system') {
            const content = msg.content ?? ''
            const tag = content.includes('<available_skills>') ? ' [SKILLS列表]'
                : content.includes('Local command') ? ' [WORKSPACE]'
                : content.includes('Skills are NOT tools') ? ' [SKILLS指令]'
                : ''
            lines.push(`  [${role}]${tag}\n${content}`)
        } else if (msg.role === 'user') {
            const text = msg.content
                ?.filter((p: any) => p.type === 'text')
                .map((p: any) => p.text)
                .join('') ?? ''
            lines.push(`  [${role}]\n${text}`)
        } else if (msg.role === 'assistant') {
            const textParts = msg.content?.filter((p: any) => p.type === 'text') ?? []
            const toolParts = msg.content?.filter((p: any) => p.type === 'tool-call') ?? []
            const text = textParts.map((p: any) => p.text).join('')
            if (text) lines.push(`  [${role}]\n${text}`)
            for (const tc of toolParts) {
                const args = JSON.stringify(tc.args ?? {}, null, 2)
                lines.push(`  [${role}] 🔨 tool-call: ${tc.toolName}(${args})`)
            }
        } else if (msg.role === 'tool') {
            const results = msg.content?.filter((p: any) => p.type === 'tool-result') ?? []
            for (const r of results) {
                const raw = typeof r.result === 'string' ? r.result : JSON.stringify(r.result ?? '', null, 2)
                lines.push(`  [TOOL-RESULT] ${r.input?.name} ${r.output.value}`)
                // const isEmpty = !r.result || raw === '' || raw === 'null' || raw === '{}'
                // lines.push(`  [TOOL-RESULT] ${r.toolName}${isEmpty ? ' ⚠️ 空结果' : ''}:\n${raw}`)
            }
        }
    }
    return lines.join('\n\n')
}

const loggingMiddleware: LanguageModelMiddleware = {
    transformParams: async ({ type, params }) => {
        if (!LOG_ENABLED) return params

        const now = Date.now()
        const t = new Date().toISOString()
        // 超过 5s 没有 LLM 调用 → 视为新请求，重置轮次
        if (now - lastRequestTime > 5000) roundCounter = 0
        lastRequestTime = now
        roundCounter++

        const prompt = params.prompt ?? []
        const tools = (params as any).tools ?? []

        // 统计各角色消息数
        const counts: Record<string, number> = {}
        for (const msg of prompt) {
            counts[msg.role] = (counts[msg.role] ?? 0) + 1
        }

        // 统计 tool-call 和 tool-result
        const toolCalls = prompt
            .filter((m: any) => m.role === 'assistant')
            .flatMap((m: any) => m.content?.filter((p: any) => p.type === 'tool-call') ?? [])
        const toolResults = prompt
            .filter((m: any) => m.role === 'tool')
            .flatMap((m: any) => m.content?.filter((p: any) => p.type === 'tool-result') ?? [])

        const header = roundCounter === 1
            ? `\n${LOG_TAG}:221 [${t}] 🚀 LLM 请求 (${type}) Round #${roundCounter} ──────────────────────`
            : `\n${LOG_TAG}:222 [${t}] 🔄 LLM 续轮 (${type}) Round #${roundCounter} ──────────────────────`

        // 每轮都打印完整工具 schema
        let toolInfo = ''
        if (tools.length) {
            const names = tools.map((t: any) => t.name)
            toolInfo = `\n${LOG_TAG}:228 [${t}] 🔧 工具列表 (${tools.length}) → ${names.join(', ')}`
            for (const tool of tools) {
                const schema = JSON.stringify(tool.parameters ?? {}, null, 2)
                toolInfo += `\n${LOG_TAG}:231   📐 ${tool.name}: ${schema}`
            }
        }

        console.log(
            header +
            `\n${LOG_TAG}:237 [${t}] 📊 消息统计 → ${Object.entries(counts).map(([r, n]) => `${r}:${n}`).join(' ')}` +
            ` | tool-calls:${toolCalls.length} tool-results:${toolResults.length}` +
            toolInfo +
            `\n${LOG_TAG}:240 [${t}] 📋 完整 Prompt:\n${formatPromptForLog(prompt)}` +
            `\n${LOG_TAG}:241 [${t}] ──────────────────────────────────────────`,
        )

        return params
    },
}

export const llm = wrapLanguageModel({
    model: baseModel,
    middleware: loggingMiddleware,
})
