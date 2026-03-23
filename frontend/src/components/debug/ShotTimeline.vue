<script setup lang="ts">
import { computed } from 'vue'
import type { Shot } from '@/types/debug'
import ShotCard from './ShotCard.vue'

const props = defineProps<{ shots: Shot[] }>()

const totalDuration = computed(() =>
    props.shots.reduce((sum, s) => sum + (s.duration ?? 0), 0),
)
</script>

<template>
    <div class="space-y-3">
        <!-- 统计 -->
        <div class="flex items-center gap-4 text-xs text-zinc-500">
            <span>共 {{ shots.length }} 个镜头</span>
            <span>总时长 {{ totalDuration }}s</span>
        </div>

        <!-- 横向可滚动时间线 -->
        <div class="overflow-x-auto pb-2">
            <div class="flex gap-3 min-w-max">
                <ShotCard
                    v-for="(shot, i) in shots"
                    :key="i"
                    :shot="shot"
                    :index="i"
                />
            </div>
        </div>
    </div>
</template>
