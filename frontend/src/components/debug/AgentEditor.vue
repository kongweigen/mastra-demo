<script setup lang="ts">
import { ref, watch } from 'vue'
import { AGENT_CONFIGS } from '@/config/agents'

const props = defineProps<{
    instructionOverrides: Record<string, string>
}>()
const emit = defineEmits<{
    (e: 'override', agentId: string, text: string): void
    (e: 'clear', agentId: string): void
}>()

const selectedAgent = ref('')
const originalText = ref('')
const editText = ref('')
const loading = ref(false)
const expanded = ref(false)

const isModified = ref(false)

watch(selectedAgent, async (agentId) => {
    if (!agentId) return
    loading.value = true
    try {
        // 先检查是否已有覆盖
        if (props.instructionOverrides[agentId]) {
            editText.value = props.instructionOverrides[agentId]
        } else {
            const res = await fetch(`/api/debug/agent/${agentId}/instructions`)
            const data = await res.json()
            editText.value = data.instructions ?? ''
        }
        originalText.value = editText.value
        isModified.value = !!props.instructionOverrides[agentId]
    } finally {
        loading.value = false
    }
})

function handleSave() {
    if (!selectedAgent.value) return
    emit('override', selectedAgent.value, editText.value)
    isModified.value = true
}

function handleReset() {
    if (!selectedAgent.value) return
    emit('clear', selectedAgent.value)
    // 重新加载原始
    editText.value = originalText.value
    isModified.value = false
}
</script>

<template>
    <div class="border-t border-zinc-800 pt-3">
        <button
            class="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 w-full"
            @click="expanded = !expanded"
        >
            <span>{{ expanded ? '▾' : '▸' }}</span>
            <span class="font-medium">Agent 指令编辑</span>
            <span v-if="Object.keys(instructionOverrides).length" class="ml-auto text-yellow-500">
                {{ Object.keys(instructionOverrides).length }} 已修改
            </span>
        </button>

        <div v-if="expanded" class="mt-2 space-y-2">
            <select
                v-model="selectedAgent"
                class="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-200"
            >
                <option value="">选择 Agent…</option>
                <option
                    v-for="agent in AGENT_CONFIGS"
                    :key="agent.id"
                    :value="agent.id"
                >
                    {{ agent.icon }} {{ agent.name }} ({{ agent.id }})
                </option>
            </select>

            <div v-if="loading" class="text-xs text-zinc-500 animate-pulse">加载中...</div>

            <template v-if="selectedAgent && !loading">
                <textarea
                    v-model="editText"
                    class="w-full h-48 rounded bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 font-mono resize-y"
                    placeholder="Agent instructions..."
                />
                <div class="flex gap-2">
                    <button
                        class="flex-1 rounded bg-blue-600 hover:bg-blue-500 px-2 py-1 text-xs text-white"
                        @click="handleSave"
                    >
                        应用覆盖
                    </button>
                    <button
                        v-if="isModified"
                        class="rounded bg-zinc-700 hover:bg-zinc-600 px-2 py-1 text-xs text-zinc-300"
                        @click="handleReset"
                    >
                        恢复原始
                    </button>
                </div>
                <p v-if="isModified" class="text-xs text-yellow-500">
                    已覆盖 — 后续调用此 agent 将使用修改后的指令
                </p>
            </template>
        </div>
    </div>
</template>
