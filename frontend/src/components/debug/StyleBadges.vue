<script setup lang="ts">
import type { StyleAnalysis } from '@/types/debug'

defineProps<{ style: StyleAnalysis }>()

const dimensionLabels: { key: keyof StyleAnalysis; label: string; color: string }[] = [
    { key: 'genre', label: '题材', color: 'bg-purple-900/50 text-purple-300 border-purple-700' },
    { key: 'emotionalTone', label: '情感', color: 'bg-red-900/50 text-red-300 border-red-700' },
    { key: 'visualMood', label: '视觉', color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
    { key: 'environmentKeywords', label: '环境', color: 'bg-green-900/50 text-green-300 border-green-700' },
    { key: 'pacing', label: '节奏', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
]
</script>

<template>
    <div class="space-y-3">
        <!-- 标签行 -->
        <div class="flex flex-wrap gap-2">
            <div
                v-for="dim in dimensionLabels"
                :key="dim.key"
                v-show="style[dim.key]"
                class="rounded-md border px-2 py-1 text-xs"
                :class="dim.color"
            >
                <span class="opacity-60">{{ dim.label }}:</span>
                <span class="ml-1">{{ style[dim.key] }}</span>
            </div>
        </div>

        <!-- Summary -->
        <blockquote v-if="style.summary" class="border-l-2 border-zinc-600 pl-3 text-sm text-zinc-300 italic">
            {{ style.summary }}
        </blockquote>
    </div>
</template>
