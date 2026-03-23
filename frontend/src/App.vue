<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ChatLayout from './components/ChatLayout.vue'
import DebugWorkbench from './components/debug/DebugWorkbench.vue'

type Page = 'chat' | 'debug'

function getPage(): Page {
    return location.hash === '#/debug' ? 'debug' : 'chat'
}

const currentPage = ref<Page>(getPage())

function onHashChange() {
    currentPage.value = getPage()
}

function navigate(page: Page) {
    location.hash = page === 'debug' ? '#/debug' : '#/chat'
}

onMounted(() => window.addEventListener('hashchange', onHashChange))
onUnmounted(() => window.removeEventListener('hashchange', onHashChange))
</script>

<template>
    <div class="flex h-screen flex-col">
        <!-- 顶部导航 -->
        <nav class="flex items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-4 py-1.5">
            <span class="text-sm font-semibold text-zinc-300 mr-4">AgentStack</span>
            <button
                class="rounded px-3 py-1 text-sm transition-colors"
                :class="currentPage === 'chat'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'"
                @click="navigate('chat')"
            >
                对话
            </button>
            <button
                class="rounded px-3 py-1 text-sm transition-colors"
                :class="currentPage === 'debug'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'"
                @click="navigate('debug')"
            >
                调测工作台
            </button>
        </nav>

        <!-- 页面内容 -->
        <ChatLayout v-if="currentPage === 'chat'" />
        <DebugWorkbench v-else />
    </div>
</template>
