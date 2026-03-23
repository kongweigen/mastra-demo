<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    visible: boolean
    title: string
    rawText: string
    parsedJson: any
}>()
const emit = defineEmits<{
    (e: 'close'): void
}>()

/** 简易 JSON 语法高亮 */
const highlighted = computed(() => {
    if (!props.parsedJson) return escapeHtml(props.rawText)
    try {
        const json = JSON.stringify(props.parsedJson, null, 2)
        return json
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
            .replace(/: "([^"]*)"/g, ': <span class="text-green-400">"$1"</span>')
            .replace(/: (\d+\.?\d*)/g, ': <span class="text-yellow-400">$1</span>')
            .replace(/: (true|false|null)/g, ': <span class="text-purple-400">$1</span>')
    } catch {
        return escapeHtml(props.rawText)
    }
})

function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<template>
    <!-- Overlay -->
    <Teleport to="body">
        <Transition name="drawer">
            <div v-if="visible" class="fixed inset-0 z-50 flex justify-end">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-black/50" @click="emit('close')" />

                <!-- Drawer -->
                <div class="relative w-[600px] max-w-[85vw] h-full bg-zinc-900 border-l border-zinc-700 flex flex-col">
                    <!-- Header -->
                    <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                        <span class="font-medium text-zinc-200 text-sm">{{ title }} — 原始数据</span>
                        <button
                            class="text-zinc-400 hover:text-zinc-200 text-lg"
                            @click="emit('close')"
                        >&times;</button>
                    </div>

                    <!-- 内容 -->
                    <div class="flex-1 overflow-auto p-4">
                        <h3 class="text-xs text-zinc-500 mb-2">Raw Output</h3>
                        <pre class="text-xs text-zinc-400 whitespace-pre-wrap break-words bg-zinc-950 rounded p-3 mb-4 max-h-[40vh] overflow-y-auto">{{ rawText }}</pre>

                        <h3 class="text-xs text-zinc-500 mb-2">Parsed JSON</h3>
                        <pre
                            class="text-xs whitespace-pre-wrap break-words bg-zinc-950 rounded p-3 max-h-[40vh] overflow-y-auto"
                            v-html="highlighted"
                        />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
    transition: opacity 0.2s ease;
}
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
    transition: transform 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
    opacity: 0;
}
.drawer-enter-from > div:last-child {
    transform: translateX(100%);
}
.drawer-leave-to > div:last-child {
    transform: translateX(100%);
}
</style>
