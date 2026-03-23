import { reactive } from 'vue'
import type { AgentCallState, ToolCallEvent } from '@/types/debug'

/** 创建初始调用状态 */
function createCallState(): AgentCallState {
    return {
        status: 'idle',
        thinkBlocks: [],
        currentThink: '',
        toolCalls: [],
        textContent: '',
        rawOutput: '',
        parsedJson: null,
        error: null,
    }
}

/**
 * 单轮 Agent 调用 composable
 *
 * 与 useChat 的区别：
 * - 无对话历史管理，每次调用独立
 * - 分离 think/tool/text 三种流式事件到不同字段
 * - 支持 instructionsOverride
 */
export function useAgentCall() {
    /**
     * 调用指定 agent 并返回响应式状态对象
     *
     * @param agentId - agent 标识
     * @param userMessage - 单条用户消息文本
     * @param options.instructionsOverride - 可选的 instructions 覆盖
     */
    async function callAgent(
        agentId: string,
        userMessage: string,
        options?: { instructionsOverride?: string },
    ): Promise<AgentCallState> {
        const state = reactive<AgentCallState>(createCallState())
        state.status = 'streaming'

        const useDebugEndpoint = !!options?.instructionsOverride
        const endpoint = useDebugEndpoint ? '/api/debug/chat' : '/api/chat'
        const threadId = `debug-${Date.now()}-${agentId}`

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ id: `user-${Date.now()}`, role: 'user', content: userMessage }],
                    agentId,
                    resourceId: `debug-${Date.now()}`,
                    threadId,
                    ...(options?.instructionsOverride ? { instructionsOverride: options.instructionsOverride } : {}),
                }),
            })

            if (!res.ok) {
                const errBody = await res.text()
                throw new Error(`HTTP ${res.status}: ${errBody}`)
            }

            const reader = res.body?.getReader()
            if (!reader) throw new Error('No response body')

            const decoder = new TextDecoder()
            let buffer = ''
            let inThink = false // 状态机: 是否在 <think> 块内

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed) continue

                    const colonIdx = trimmed.indexOf(':')
                    if (colonIdx === -1) continue

                    const typeCode = trimmed.slice(0, colonIdx)
                    const payload = trimmed.slice(colonIdx + 1)

                    try {
                        processStreamPart(typeCode, payload, state, inThink, (v) => { inThink = v })
                    } catch {
                        // 忽略解析错误
                    }
                }
            }

            // 处理剩余 buffer
            if (buffer.trim()) {
                const colonIdx = buffer.indexOf(':')
                if (colonIdx !== -1) {
                    try {
                        processStreamPart(
                            buffer.slice(0, colonIdx),
                            buffer.slice(colonIdx + 1),
                            state,
                            inThink,
                            (v) => { inThink = v },
                        )
                    } catch { /* ignore */ }
                }
            }

            // 关闭未闭合的 think 块
            if (inThink && state.currentThink) {
                state.thinkBlocks.push(state.currentThink)
                state.currentThink = ''
            }

            // 尝试从 textContent 提取 JSON
            state.parsedJson = extractJSON(state.textContent)
            state.status = 'done'
        } catch (err: any) {
            state.error = err?.message ?? 'Unknown error'
            state.status = 'error'
        }

        return state
    }

    return { callAgent }
}

/**
 * 处理单个流式分片
 *
 * 扩展自 useChat.ts 的 handleStreamPart，额外处理:
 * - <think> 标签的增量解析 (可能跨分片)
 * - Tool 调用事件分离
 */
function processStreamPart(
    typeCode: string,
    payload: string,
    state: AgentCallState,
    inThink: boolean,
    setInThink: (v: boolean) => void,
) {
    const data = JSON.parse(payload)

    switch (typeCode) {
        case '0': {
            // text delta
            const text = typeof data === 'string' ? data : String(data)
            state.rawOutput += text

            // 增量解析 <think> 标签
            let remaining = text
            while (remaining.length > 0) {
                if (inThink) {
                    const closeIdx = remaining.indexOf('</think>')
                    if (closeIdx !== -1) {
                        state.currentThink += remaining.slice(0, closeIdx)
                        state.thinkBlocks.push(state.currentThink)
                        state.currentThink = ''
                        setInThink(false)
                        remaining = remaining.slice(closeIdx + '</think>'.length)
                    } else {
                        state.currentThink += remaining
                        remaining = ''
                    }
                } else {
                    const openIdx = remaining.indexOf('<think>')
                    if (openIdx !== -1) {
                        if (openIdx > 0) {
                            state.textContent += remaining.slice(0, openIdx)
                        }
                        setInThink(true)
                        state.currentThink = ''
                        remaining = remaining.slice(openIdx + '<think>'.length)
                    } else {
                        state.textContent += remaining
                        remaining = ''
                    }
                }
            }
            break
        }

        case 'e': {
            // tool call streaming start
            const event: ToolCallEvent = {
                id: data.toolCallId ?? `tool-${Date.now()}`,
                toolName: data.toolName ?? 'tool',
                state: 'pending',
                args: {},
            }
            state.toolCalls.push(event)
            break
        }

        case '2': {
            // tool call complete: [toolCallId, toolName, args]
            if (Array.isArray(data)) {
                const [callId, toolName, args] = data
                const existing = state.toolCalls.find((t) => t.id === callId)
                if (existing) {
                    existing.toolName = toolName
                    existing.args = args
                    existing.state = 'complete'
                } else {
                    state.toolCalls.push({ id: callId, toolName, state: 'complete', args })
                }
            }
            break
        }

        case '9': {
            // tool result
            if (Array.isArray(data)) {
                const [callId, result] = data
                const existing = state.toolCalls.find((t) => t.id === callId)
                if (existing) {
                    existing.state = 'result'
                    existing.result = result
                }
            } else if (data?.toolCallId) {
                const existing = state.toolCalls.find((t) => t.id === data.toolCallId)
                if (existing) {
                    existing.state = 'result'
                    existing.result = data.result
                }
            }
            break
        }

        // f=finish, d=done, g=start-step, h=finish-step — 忽略
        default:
            break
    }
}

/**
 * 从文本中提取 JSON 对象
 * 去除 think 标签后找到第一个 { 到最后一个 } 的子串
 */
function extractJSON(text: string): any | null {
    try {
        const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        const firstBrace = cleaned.indexOf('{')
        const lastBrace = cleaned.lastIndexOf('}')
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
    } catch {
        return null
    }
}
