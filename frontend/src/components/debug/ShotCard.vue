<script setup lang="ts">
import { ref } from 'vue'
import type { Shot } from '@/types/debug'

defineProps<{ shot: Shot; index: number }>()

const expanded = ref(false)
</script>

<template>
    <div
        class="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 min-w-[220px] max-w-[260px] flex-shrink-0 text-sm cursor-pointer hover:border-zinc-500 transition-colors"
        @click="expanded = !expanded"
    >
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-xs text-zinc-500">Shot {{ index + 1 }}</span>
            <div class="flex gap-1.5 text-xs">
                <span class="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">{{ shot.shot_type }}</span>
                <span class="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">{{ shot.camera_movement }}</span>
            </div>
        </div>

        <!-- 时长 -->
        <div class="text-xs text-zinc-500 mb-2">{{ shot.duration }}s</div>

        <!-- 台词 -->
        <div v-if="shot.dialogue" class="text-xs mb-2">
            <span class="text-zinc-500">{{ shot.speaker ?? '旁白' }}:</span>
            <span class="text-zinc-300 ml-1">"{{ shot.dialogue }}"</span>
        </div>

        <!-- 动作 -->
        <div class="text-xs text-zinc-400 mb-2">{{ shot.action }}</div>

        <!-- 角色/场景 -->
        <div class="flex flex-wrap gap-1 text-xs">
            <span
                v-for="char in shot.characters"
                :key="char"
                class="px-1 py-0.5 rounded bg-blue-900/40 text-blue-300"
            >{{ char }}</span>
            <span class="px-1 py-0.5 rounded bg-green-900/40 text-green-300">{{ shot.scene }}</span>
        </div>

        <!-- 展开详情 -->
        <div v-if="expanded" class="mt-3 pt-2 border-t border-zinc-700/50 space-y-1 text-xs text-zinc-500">
            <div v-if="shot.visual_prompt">
                <span class="text-zinc-600">visual_prompt:</span>
                <div class="text-zinc-400 whitespace-pre-wrap mt-0.5">{{ shot.visual_prompt }}</div>
            </div>
            <div v-if="shot.emotion">情绪: {{ shot.emotion }}</div>
            <div v-if="shot.gen_mode">gen_mode: {{ shot.gen_mode }}</div>
            <div v-if="shot.audio_type">audio_type: {{ shot.audio_type }}</div>
            <div v-if="shot.group_id">group: {{ shot.group_id }} [{{ shot.group_index }}]</div>
            <div class="flex gap-2">
                <span v-if="shot.need_shot_image" class="text-yellow-500">需要截图</span>
                <span v-if="shot.need_character_ref" class="text-blue-500">需要角色参考</span>
                <span v-if="shot.need_scene_ref" class="text-green-500">需要场景参考</span>
            </div>
        </div>
    </div>
</template>
