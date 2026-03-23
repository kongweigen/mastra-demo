<script setup lang="ts">
import type { VideoModel, WorkflowState } from '@/types/debug'
import AgentEditor from './AgentEditor.vue'
import SkillEditor from './SkillEditor.vue'

const props = defineProps<{
    state: WorkflowState
    isRunning: boolean
}>()

const emit = defineEmits<{
    (e: 'update:scriptInput', value: string): void
    (e: 'rewrite'): void
    (e: 'extract'): void
    (e: 'style'): void
    (e: 'characterPrompts'): void
    (e: 'scenePrompts'): void
    (e: 'storyboard'): void
    (e: 'setVideoModel', model: VideoModel): void
    (e: 'overrideInstructions', agentId: string, text: string): void
    (e: 'clearInstructions', agentId: string): void
    (e: 'reset'): void
}>()

const videoModels: { value: VideoModel; label: string }[] = [
    { value: 'kling-v3-omni', label: 'Kling v3 Omni' },
    { value: 'seedance-2', label: 'Seedance 2.0' },
    { value: 'seedance-1.5-pro', label: 'Seedance 1.5 Pro' },
]
</script>

<template>
    <div class="flex flex-col h-full space-y-3 p-3">
        <!-- 剧本输入 -->
        <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-zinc-200">剧本输入</span>
            <button
                class="text-xs text-zinc-500 hover:text-zinc-300"
                @click="emit('reset')"
            >清空</button>
        </div>

        <textarea
            :value="state.scriptInput"
            @input="emit('update:scriptInput', ($event.target as HTMLTextAreaElement).value)"
            class="flex-1 min-h-[200px] rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-zinc-500"
            placeholder="粘贴剧本片段..."
        />

        <!-- Step 1 & 2 动作按钮 -->
        <div class="space-y-2">
            <div class="text-xs text-zinc-500">基础处理</div>
            <div class="flex flex-wrap gap-2">
                <button
                    class="rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                    :disabled="!state.scriptInput.trim() || isRunning"
                    @click="emit('extract')"
                >提取角色&amp;场景</button>
                <button
                    class="rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                    :disabled="!state.scriptInput.trim() || isRunning"
                    @click="emit('style')"
                >分析风格</button>
                <button
                    class="rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                    :disabled="!state.scriptInput.trim() || isRunning"
                    @click="emit('rewrite')"
                >改写剧本</button>
            </div>
        </div>

        <!-- Step 3 提示词 -->
        <div class="space-y-2">
            <div class="text-xs text-zinc-500">提示词生成</div>
            <div class="flex flex-wrap gap-2">
                <button
                    class="rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                    :disabled="!state.extraction?.characters?.length || isRunning"
                    @click="emit('characterPrompts')"
                >角色生图提示词</button>
                <button
                    class="rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                    :disabled="!state.extraction?.scenes?.length || isRunning"
                    @click="emit('scenePrompts')"
                >场景生图提示词</button>
            </div>
        </div>

        <!-- Step 4 分镜 -->
        <div class="space-y-2">
            <div class="text-xs text-zinc-500">分镜提取</div>
            <div class="flex gap-2 items-center">
                <select
                    :value="state.videoModel"
                    @change="emit('setVideoModel', ($event.target as HTMLSelectElement).value as VideoModel)"
                    class="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200"
                >
                    <option v-for="m in videoModels" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
                <button
                    class="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs text-white disabled:opacity-40"
                    :disabled="!state.scriptInput.trim() || isRunning"
                    @click="emit('storyboard')"
                >生成分镜</button>
            </div>
        </div>

        <!-- Agent / Skill 编辑区 -->
        <div class="space-y-1 mt-auto">
            <AgentEditor
                :instruction-overrides="state.instructionOverrides"
                @override="(agentId: string, text: string) => emit('overrideInstructions', agentId, text)"
                @clear="(agentId: string) => emit('clearInstructions', agentId)"
            />
            <SkillEditor />
        </div>
    </div>
</template>
