<script setup lang="ts">
defineProps<{
    content: string
}>()
</script>

<template>
    <details class="my-2 group">
        <summary class="cursor-pointer select-none text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <span class="inline-flex items-center gap-1">
                思考过程
                <span class="text-zinc-600 group-open:rotate-90 transition-transform inline-block">&#9654;</span>
            </span>
        </summary>
        <div
            class="mt-1 rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400 whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto"
        >
            {{ content }}
        </div>
    </details>
</template>
