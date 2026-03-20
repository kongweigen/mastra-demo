<script setup lang="ts">
import { provide, ref } from 'vue'
import { useChat } from '@/composables/useChat'
import { AGENT_CONFIGS, DEFAULT_AGENT_ID } from '@/config/agents'
import ChatHeader from './ChatHeader.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'

const selectedAgent = ref(DEFAULT_AGENT_ID)
const chat = useChat()

const agentConfig = () => AGENT_CONFIGS.find((a) => a.id === selectedAgent.value)

function handleSend(text: string) {
    chat.sendMessage(text, selectedAgent.value)
}

// 通过 provide/inject 共享状态
provide('chat', chat)
provide('selectedAgent', selectedAgent)
provide('agentConfig', agentConfig)
</script>

<template>
    <main class="flex h-screen flex-col">
        <ChatHeader
            :selected-agent="selectedAgent"
            :agent-config="agentConfig()"
            :message-count="chat.messages.value.length"
            @select-agent="selectedAgent = $event"
            @clear="chat.clearMessages()"
        />
        <ChatMessages
            :messages="chat.messages.value"
            :is-loading="chat.isLoading.value"
            :error="chat.error.value"
        />
        <ChatInput
            :is-loading="chat.isLoading.value"
            :agent-name="agentConfig()?.name ?? '智能体'"
            @send="handleSend"
            @stop="chat.stopGeneration()"
        />
    </main>
</template>
