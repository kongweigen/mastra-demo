<script setup lang="ts">
import type { Scene } from '@/types/debug'

defineProps<{ scene: Scene }>()
</script>

<template>
    <div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 text-sm space-y-2">
        <!-- 头部 -->
        <div class="font-bold text-zinc-100">{{ scene.name }}</div>

        <!-- 时间/地点 -->
        <div class="text-xs text-zinc-400 flex flex-wrap gap-x-3">
            <span v-if="scene.time_desc">{{ scene.time_desc }}</span>
            <span v-if="scene.location_desc">{{ scene.location_desc }}</span>
        </div>

        <!-- 环境描述 -->
        <div v-if="scene.environment_desc" class="text-xs text-zinc-400">
            {{ scene.environment_desc }}
        </div>

        <!-- Visual Summary -->
        <div v-if="scene.visual_summary" class="text-xs text-zinc-500 border-t border-zinc-700/50 pt-2 italic">
            {{ scene.visual_summary }}
        </div>
    </div>
</template>
