<script setup lang="ts">
import { ref } from 'vue'
import type { PromptResult } from '@/types/debug'

defineProps<{ prompt: PromptResult; index: number }>()

const copiedField = ref('')

async function copy(text: string, field: string) {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => { copiedField.value = '' }, 2000)
}
</script>

<template>
    <div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 text-sm space-y-2">
        <!-- 头部 -->
        <div class="flex items-center justify-between">
            <span class="font-mono text-zinc-400 text-xs">#{{ index + 1 }}</span>
            <span v-if="prompt.characterName" class="text-zinc-300 text-xs">{{ prompt.characterName }}</span>
            <span v-else-if="prompt.sceneName" class="text-zinc-300 text-xs">{{ prompt.sceneName }}</span>
            <span v-else-if="prompt.storyboardId" class="text-zinc-500 text-xs">{{ prompt.storyboardId }}</span>
        </div>

        <!-- 正向提示词 -->
        <div>
            <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-zinc-500">Prompt</span>
                <button
                    class="text-xs text-blue-400 hover:text-blue-300"
                    @click="copy(prompt.engineeredPrompt, 'positive')"
                >{{ copiedField === 'positive' ? '已复制' : '复制' }}</button>
            </div>
            <div class="text-xs text-zinc-300 bg-zinc-800 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {{ prompt.engineeredPrompt }}
            </div>
        </div>

        <!-- 负向提示词 -->
        <div v-if="prompt.negativePrompt">
            <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-zinc-500">Negative</span>
                <button
                    class="text-xs text-blue-400 hover:text-blue-300"
                    @click="copy(prompt.negativePrompt!, 'negative')"
                >{{ copiedField === 'negative' ? '已复制' : '复制' }}</button>
            </div>
            <div class="text-xs text-zinc-400 bg-zinc-800 rounded p-2 whitespace-pre-wrap break-words">
                {{ prompt.negativePrompt }}
            </div>
        </div>

        <!-- 参数 -->
        <div v-if="prompt.promptParams && Object.keys(prompt.promptParams).length" class="text-xs text-zinc-500">
            <span class="text-zinc-600">Params:</span>
            <code class="ml-1">{{ JSON.stringify(prompt.promptParams) }}</code>
        </div>
    </div>
</template>
