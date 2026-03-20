<script setup lang="ts">
import { ref } from 'vue'
import { AGENT_CONFIGS, type AgentConfig } from '@/config/agents'
import SkillsPanel from './SkillsPanel.vue'

defineProps<{
    selectedAgent: string
    agentConfig?: AgentConfig
    messageCount: number
}>()

const emit = defineEmits<{
    selectAgent: [agentId: string]
    clear: []
}>()

const skillsOpen = ref(false)
</script>

<template>
    <header class="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950">
        <div class="flex items-center gap-3">
            <h1 class="text-lg font-semibold text-zinc-100">AgentStack 演示</h1>
            <select
                :value="selectedAgent"
                @change="emit('selectAgent', ($event.target as HTMLSelectElement).value)"
                class="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            >
                <option v-for="agent in AGENT_CONFIGS" :key="agent.id" :value="agent.id">
                    {{ agent.icon }} {{ agent.name }}
                </option>
            </select>
            <span v-if="agentConfig" class="hidden text-sm text-zinc-500 sm:inline">
                {{ agentConfig.description }}
            </span>
        </div>
        <div class="flex items-center gap-2">
            <button
                @click="skillsOpen = true"
                class="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
                技能
            </button>
            <span v-if="messageCount > 0" class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {{ messageCount }} 条消息
            </span>
            <button
                v-if="messageCount > 0"
                @click="emit('clear')"
                class="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
                清空
            </button>
        </div>
    </header>
    <SkillsPanel :open="skillsOpen" @close="skillsOpen = false" />
</template>
