<script setup lang="ts">
import { computed } from 'vue'
import type { EmotionPoint } from '@/types/debug'

const props = defineProps<{ points: EmotionPoint[] }>()

const W = 600
const H = 200
const PAD = { top: 20, right: 20, bottom: 40, left: 40 }
const chartW = W - PAD.left - PAD.right
const chartH = H - PAD.top - PAD.bottom

const sorted = computed(() =>
    [...props.points].sort((a, b) => a.position - b.position),
)

function x(pos: number) { return PAD.left + pos * chartW }
function y(score: number) { return PAD.top + chartH - (score / 100) * chartH }

/** SVG polyline points */
const linePath = computed(() =>
    sorted.value.map((p) => `${x(p.position)},${y(p.score)}`).join(' '),
)

/** 情绪颜色映射 */
const emotionColors: Record<string, string> = {
    tension: '#ef4444', curiosity: '#3b82f6', conflict: '#f97316',
    romance: '#ec4899', sad: '#6366f1', neutral: '#a1a1aa',
    happy: '#22c55e', angry: '#dc2626', fear: '#8b5cf6', surprise: '#eab308',
}
</script>

<template>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" preserveAspectRatio="xMidYMid meet">
        <!-- 网格线 -->
        <line
            v-for="tick in [0, 25, 50, 75, 100]"
            :key="tick"
            :x1="PAD.left" :y1="y(tick)" :x2="W - PAD.right" :y2="y(tick)"
            stroke="#3f3f46" stroke-width="0.5" stroke-dasharray="4,4"
        />
        <text
            v-for="tick in [0, 50, 100]"
            :key="'label-' + tick"
            :x="PAD.left - 6" :y="y(tick) + 4"
            text-anchor="end" fill="#71717a" font-size="10"
        >{{ tick }}</text>

        <!-- 折线 -->
        <polyline
            v-if="sorted.length > 1"
            :points="linePath"
            fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round"
        />

        <!-- 数据点 -->
        <g v-for="(pt, i) in sorted" :key="i">
            <circle
                :cx="x(pt.position)" :cy="y(pt.score)" r="5"
                :fill="emotionColors[pt.emotion] ?? '#a1a1aa'"
                stroke="#18181b" stroke-width="2"
            />
            <!-- 标签 -->
            <text
                :x="x(pt.position)"
                :y="y(pt.score) - 10"
                text-anchor="middle" fill="#d4d4d8" font-size="9"
            >{{ pt.emotion }}</text>
            <text
                :x="x(pt.position)"
                :y="H - 8"
                text-anchor="middle" fill="#71717a" font-size="9"
            >{{ pt.keywords }}</text>
        </g>
    </svg>
</template>
