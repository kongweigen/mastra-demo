<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage } from '@/composables/useChat'
import ThinkingBlock from './ThinkingBlock.vue'

const props = defineProps<{
    messages: ChatMessage[]
    isLoading: boolean
    error: string | null
}>()

const bottomRef = ref<HTMLDivElement>()

watch(
    () => props.messages.length,
    async () => {
        await nextTick()
        bottomRef.value?.scrollIntoView({ behavior: 'smooth' })
    },
)

/** 将文本按 think 标签拆分为思考块和正文块 */
function parseThinkBlocks(text: string): Array<{ type: 'think' | 'text'; content: string }> {
    const blocks: Array<{ type: 'think' | 'text'; content: string }> = []
    const thinkOpen = '<' + 'think>'
    const thinkClose = '</' + 'think>'
    let remaining = text
    let startIdx: number

    while ((startIdx = remaining.indexOf(thinkOpen)) !== -1) {
        if (startIdx > 0) {
            const before = remaining.slice(0, startIdx).trim()
            if (before) blocks.push({ type: 'text', content: before })
        }
        remaining = remaining.slice(startIdx + thinkOpen.length)

        const endIdx = remaining.indexOf(thinkClose)
        if (endIdx !== -1) {
            const thinking = remaining.slice(0, endIdx).trim()
            if (thinking) blocks.push({ type: 'think', content: thinking })
            remaining = remaining.slice(endIdx + thinkClose.length)
        } else {
            // 未闭合的 think 标签
            const thinking = remaining.trim()
            if (thinking) blocks.push({ type: 'think', content: thinking })
            remaining = ''
        }
    }

    if (remaining.trim()) {
        blocks.push({ type: 'text', content: remaining.trim() })
    }

    return blocks.length > 0 ? blocks : [{ type: 'text', content: text }]
}
</script>

<template>
    <!-- 空状态 -->
    <div v-if="messages.length === 0" class="flex flex-1 items-center justify-center p-8">
        <div class="text-center space-y-3">
            <h2 class="text-2xl font-bold text-zinc-100">AgentStack 演示</h2>
            <p class="text-zinc-500 max-w-md">
                从上方下拉菜单选择一个智能体，或使用路由器自动将请求分配给最合适的专家。
            </p>
        </div>
    </div>

    <!-- 消息列表 -->
    <div v-else class="flex-1 overflow-y-auto p-4">
        <div class="mx-auto max-w-3xl space-y-4">
            <div
                v-for="message in messages"
                :key="message.id"
                :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
            >
                <div
                    :class="[
                        'max-w-[80%] rounded-lg px-4 py-3',
                        message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-200',
                    ]"
                >
                    <template v-for="(part, i) in message.parts" :key="i">
                        <!-- 文本部分：解析思考链标签 -->
                        <template v-if="part.type === 'text' && part.text">
                            <template v-for="(block, j) in parseThinkBlocks(part.text)" :key="j">
                                <ThinkingBlock v-if="block.type === 'think'" :content="block.content" />
                                <div v-else class="whitespace-pre-wrap break-words">{{ block.content }}</div>
                            </template>
                        </template>

                        <!-- 工具调用部分 -->
                        <div v-if="part.type === 'tool-invocation'" class="my-2">
                            <span class="inline-flex items-center gap-1 rounded-md border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                                {{ part.toolInvocation?.toolName ?? 'tool' }}
                                &middot; {{ part.toolInvocation?.state ?? 'running' }}
                            </span>
                            <pre
                                v-if="part.toolInvocation?.state === 'result' && part.toolInvocation?.result"
                                class="mt-1 rounded bg-zinc-900 p-2 text-xs text-zinc-400 overflow-x-auto"
                            >{{ typeof part.toolInvocation.result === 'string' ? part.toolInvocation.result : JSON.stringify(part.toolInvocation.result, null, 2) }}</pre>
                        </div>
                    </template>

                    <!-- 兜底 -->
                    <div
                        v-if="!message.parts?.length && message.content"
                        class="whitespace-pre-wrap break-words"
                    >
                        {{ message.content }}
                    </div>
                </div>
            </div>

            <div v-if="isLoading" class="flex justify-start">
                <div class="rounded-lg bg-zinc-800 px-4 py-3">
                    <span class="animate-pulse text-zinc-400">思考中...</span>
                </div>
            </div>

            <div
                v-if="error"
                class="rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-red-300"
            >
                错误：{{ error }}
            </div>

            <div ref="bottomRef" />
        </div>
    </div>
</template>
