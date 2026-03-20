import { ref, computed } from 'vue'

export interface MessagePart {
    type: 'text' | 'tool-invocation'
    text?: string
    toolInvocation?: {
        toolName: string
        state: string
        args?: any
        result?: any
    }
}

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    parts: MessagePart[]
}

/**
 * 聊天 composable — 通过 fetch + ReadableStream 消费后端的 UIMessageStream
 *
 * UIMessageStream 格式：每行是一个 JSON 数组 [typeCode, payload]
 * 类型码：0 = text-delta, 2 = tool-call-begin, 9 = tool-call, a = tool-result,
 *         e = tool-call-streaming-start, f = finish, g = start-step, h = finish-step
 */
export function useChat() {
    const messages = ref<ChatMessage[]>([])
    const status = ref<'idle' | 'submitted' | 'streaming'>('idle')
    const error = ref<string | null>(null)
    const abortController = ref<AbortController | null>(null)
    const resourceId = ref<string>(`user-${Date.now()}`)
    const threadId = ref<string>(`thread-${Date.now()}`)

    const isLoading = computed(() => status.value === 'streaming' || status.value === 'submitted')

    function addUserMessage(text: string): ChatMessage {
        const msg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            parts: [{ type: 'text', text }],
        }
        messages.value.push(msg)
        return msg
    }

    async function sendMessage(text: string, agentId: string) {
        if (!text.trim() || isLoading.value) return

        error.value = null
        addUserMessage(text)

        // 构造发给后端的消息列表（简化格式）
        const apiMessages = messages.value.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parts: m.parts,
        }))

        const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            parts: [],
        }
        messages.value.push(assistantMsg)

        const controller = new AbortController()
        abortController.value = controller
        status.value = 'submitted'

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    agentId,
                    resourceId: resourceId.value,
                    threadId: threadId.value,
                }),
                signal: controller.signal,
            })

            if (!res.ok) {
                const errBody = await res.text()
                throw new Error(`HTTP ${res.status}: ${errBody}`)
            }

            status.value = 'streaming'

            const reader = res.body?.getReader()
            if (!reader) throw new Error('No response body')

            const decoder = new TextDecoder()
            let buffer = ''
            let currentTextPart: MessagePart | null = null
            const toolCalls = new Map<string, MessagePart>()

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed) continue

                    // UIMessageStream 格式: 每行是 typeCode:jsonPayload
                    const colonIdx = trimmed.indexOf(':')
                    if (colonIdx === -1) continue

                    const typeCode = trimmed.slice(0, colonIdx)
                    const payload = trimmed.slice(colonIdx + 1)

                    try {
                        handleStreamPart(typeCode, payload, assistantMsg, currentTextPart, toolCalls, (tp) => {
                            currentTextPart = tp
                        })
                    } catch {
                        // 忽略解析错误，继续处理
                    }

                    // 触发响应式更新
                    messages.value = [...messages.value]
                }
            }

            // 处理剩余 buffer
            if (buffer.trim()) {
                const colonIdx = buffer.indexOf(':')
                if (colonIdx !== -1) {
                    try {
                        handleStreamPart(
                            buffer.slice(0, colonIdx),
                            buffer.slice(colonIdx + 1),
                            assistantMsg,
                            currentTextPart,
                            toolCalls,
                            (tp) => { currentTextPart = tp },
                        )
                        messages.value = [...messages.value]
                    } catch {
                        // ignore
                    }
                }
            }

            // 最终更新 content
            assistantMsg.content = assistantMsg.parts
                .filter((p) => p.type === 'text')
                .map((p) => p.text ?? '')
                .join('')
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                // 用户主动停止
            } else {
                error.value = err?.message ?? 'Unknown error'
            }
        } finally {
            status.value = 'idle'
            abortController.value = null
        }
    }

    function stopGeneration() {
        abortController.value?.abort()
    }

    function clearMessages() {
        messages.value = []
        error.value = null
        // 新对话使用新的 threadId
        threadId.value = `thread-${Date.now()}`
    }

    return { messages, status, error, isLoading, resourceId, threadId, sendMessage, stopGeneration, clearMessages }
}

/**
 * 处理 UIMessageStream 的单个部分
 *
 * 格式参考 AI SDK 源码：
 * - 0:string → text delta
 * - 2:array → tool call (complete)
 * - 9:object → tool result
 * - e:object → tool call streaming start
 * - f:object → finish message
 */
function handleStreamPart(
    typeCode: string,
    payload: string,
    msg: ChatMessage,
    currentTextPart: MessagePart | null,
    toolCalls: Map<string, MessagePart>,
    setTextPart: (tp: MessagePart | null) => void,
) {
    const data = JSON.parse(payload)

    switch (typeCode) {
        case '0': {
            // text delta
            const text = typeof data === 'string' ? data : String(data)
            if (!currentTextPart) {
                const part: MessagePart = { type: 'text', text }
                msg.parts.push(part)
                setTextPart(part)
            } else {
                currentTextPart.text = (currentTextPart.text ?? '') + text
            }
            break
        }

        case 'e': {
            // tool call streaming start
            setTextPart(null) // 新 text part 在工具调用后开始
            const part: MessagePart = {
                type: 'tool-invocation',
                toolInvocation: {
                    toolName: data.toolName ?? 'tool',
                    state: 'call',
                    args: {},
                },
            }
            toolCalls.set(data.toolCallId, part)
            msg.parts.push(part)
            break
        }

        case '2': {
            // tool call complete: [toolCallId, toolName, args]
            setTextPart(null)
            if (Array.isArray(data)) {
                const [callId, toolName, args] = data
                const existing = toolCalls.get(callId)
                if (existing?.toolInvocation) {
                    existing.toolInvocation.toolName = toolName
                    existing.toolInvocation.args = args
                    existing.toolInvocation.state = 'call'
                } else {
                    const part: MessagePart = {
                        type: 'tool-invocation',
                        toolInvocation: { toolName, state: 'call', args },
                    }
                    toolCalls.set(callId, part)
                    msg.parts.push(part)
                }
            }
            break
        }

        case '9': {
            // tool result
            setTextPart(null)
            if (Array.isArray(data)) {
                const [callId, result] = data
                const existing = toolCalls.get(callId)
                if (existing?.toolInvocation) {
                    existing.toolInvocation.state = 'result'
                    existing.toolInvocation.result = result
                }
            } else if (data?.toolCallId) {
                const existing = toolCalls.get(data.toolCallId)
                if (existing?.toolInvocation) {
                    existing.toolInvocation.state = 'result'
                    existing.toolInvocation.result = data.result
                }
            }
            break
        }

        case 'f':
        case 'd':
            // finish / done — 不做额外处理
            break

        default:
            // 其他类型码忽略 (g=start-step, h=finish-step, etc.)
            break
    }
}
