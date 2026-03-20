<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
    isLoading: boolean
    agentName: string
}>()

const emit = defineEmits<{
    send: [text: string]
    stop: []
}>()

const input = ref('')
const inputRef = ref<HTMLTextAreaElement>()

onMounted(() => {
    inputRef.value?.focus()
})

function handleSubmit() {
    if (!input.value.trim()) return
    emit('send', input.value)
    input.value = ''
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
    }
}
</script>

<template>
    <footer class="border-t border-zinc-800 p-4 bg-zinc-950">
        <form @submit.prevent="handleSubmit" class="mx-auto flex max-w-3xl gap-2">
            <textarea
                ref="inputRef"
                v-model="input"
                @keydown="handleKeyDown"
                :placeholder="`向${agentName}发送消息... (Enter 发送，Shift+Enter 换行)`"
                :disabled="isLoading"
                rows="1"
                class="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
            />
            <button
                v-if="isLoading"
                type="button"
                @click="emit('stop')"
                class="rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
                停止
            </button>
            <button
                v-else
                type="submit"
                :disabled="!input.trim()"
                class="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                发送
            </button>
        </form>
    </footer>
</template>
