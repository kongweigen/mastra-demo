<script setup lang="ts">
import type { AgentCallState } from '@/types/debug'

const props = defineProps<{
    callState: AgentCallState
}>()

/** 截断显示 tool 的 args/result */
function truncate(obj: any, max = 200): string {
    if (!obj) return ''
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)
    return s.length > max ? s.slice(0, max) + '…' : s
}
</script>

<template>
    <div
        v-if="callState.status !== 'idle'"
        class="rounded-lg border border-zinc-700 bg-zinc-900/80 text-sm"
    >
        <!-- Header -->
        <div class="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
            <span
                v-if="callState.status === 'streaming'"
                class="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"
            />
            <span
                v-else-if="callState.status === 'done'"
                class="inline-block h-2 w-2 rounded-full bg-green-500"
            />
            <span
                v-else-if="callState.status === 'error'"
                class="inline-block h-2 w-2 rounded-full bg-red-500"
            />
            <span class="font-medium text-zinc-300">执行过程</span>
            <span class="text-zinc-500 text-xs">
                {{ callState.thinkBlocks.length }} think ·
                {{ callState.toolCalls.length }} tool
            </span>
        </div>

        <div class="max-h-64 overflow-y-auto px-3 py-2 space-y-2">
            <!-- Think 块 -->
            <details
                v-for="(block, i) in callState.thinkBlocks"
                :key="'think-' + i"
                class="group"
            >
                <summary class="cursor-pointer text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
                    <span class="text-xs">🧠</span>
                    <span>Think #{{ i + 1 }}</span>
                    <span class="text-zinc-600 text-xs">({{ block.length }} 字)</span>
                </summary>
                <pre class="mt-1 pl-5 text-xs text-zinc-500 whitespace-pre-wrap max-h-40 overflow-y-auto">{{ block }}</pre>
            </details>

            <!-- 当前正在思考 -->
            <div
                v-if="callState.currentThink"
                class="flex items-start gap-1.5 text-zinc-400"
            >
                <span class="text-xs mt-0.5">🧠</span>
                <span class="animate-pulse text-xs">{{ callState.currentThink.slice(-120) }}…</span>
            </div>

            <!-- Tool 调用 -->
            <div
                v-for="tool in callState.toolCalls"
                :key="tool.id"
                class="border-l-2 pl-3"
                :class="{
                    'border-yellow-600': tool.state === 'pending',
                    'border-blue-600': tool.state === 'complete',
                    'border-green-600': tool.state === 'result',
                }"
            >
                <div class="flex items-center gap-2">
                    <span class="text-xs">
                        {{ tool.state === 'pending' ? '⏳' : tool.state === 'complete' ? '🔧' : '✅' }}
                    </span>
                    <span class="font-mono text-xs text-zinc-300">{{ tool.toolName }}</span>
                    <span
                        class="text-xs px-1.5 py-0.5 rounded"
                        :class="{
                            'bg-yellow-900/40 text-yellow-400': tool.state === 'pending',
                            'bg-blue-900/40 text-blue-400': tool.state === 'complete',
                            'bg-green-900/40 text-green-400': tool.state === 'result',
                        }"
                    >{{ tool.state }}</span>
                </div>
                <pre
                    v-if="tool.args && Object.keys(tool.args).length"
                    class="mt-1 text-xs text-zinc-600 whitespace-pre-wrap"
                >args: {{ truncate(tool.args) }}</pre>
                <pre
                    v-if="tool.result"
                    class="mt-1 text-xs text-zinc-500 whitespace-pre-wrap max-h-24 overflow-y-auto"
                >result: {{ truncate(tool.result, 300) }}</pre>
            </div>

            <!-- 流式文本预览 -->
            <div
                v-if="callState.status === 'streaming' && callState.textContent"
                class="text-xs text-zinc-500 border-t border-zinc-800 pt-2"
            >
                <span class="text-zinc-600">输出预览:</span>
                <span class="ml-1">{{ callState.textContent.slice(-200) }}</span>
                <span class="animate-pulse">▋</span>
            </div>

            <!-- 错误 -->
            <div
                v-if="callState.error"
                class="text-xs text-red-400 bg-red-950/30 rounded px-2 py-1"
            >
                {{ callState.error }}
            </div>
        </div>
    </div>
</template>
