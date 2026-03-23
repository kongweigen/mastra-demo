<script setup lang="ts">
import type { Character } from '@/types/debug'

defineProps<{ character: Character }>()

const roleColors: Record<string, string> = {
    PROTAGONIST: 'border-blue-500 bg-blue-950/30',
    SUPPORTING: 'border-green-500 bg-green-950/30',
    MINOR: 'border-zinc-600 bg-zinc-900/50',
}

const roleLabels: Record<string, string> = {
    PROTAGONIST: '主角',
    SUPPORTING: '配角',
    MINOR: '路人',
}
</script>

<template>
    <div
        class="rounded-lg border-l-4 p-3 text-sm space-y-2"
        :class="roleColors[character.role_type] ?? roleColors.MINOR"
    >
        <!-- 头部 -->
        <div class="flex items-center justify-between">
            <span class="font-bold text-zinc-100 text-base">{{ character.name }}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {{ roleLabels[character.role_type] ?? character.role_type }}
            </span>
        </div>

        <!-- 基本信息 -->
        <div class="text-zinc-400 text-xs flex flex-wrap gap-x-3">
            <span v-if="character.gender">{{ character.gender }}</span>
            <span v-if="character.age">{{ character.age }}</span>
            <span v-if="character.body_type">{{ character.body_type }}</span>
        </div>

        <!-- 外貌细节 -->
        <div class="text-xs space-y-1 text-zinc-400">
            <div v-if="character.face_features"><span class="text-zinc-500">面部:</span> {{ character.face_features }}</div>
            <div v-if="character.hair_style"><span class="text-zinc-500">发型:</span> {{ character.hair_style }}</div>
            <div v-if="character.clothing"><span class="text-zinc-500">服装:</span> {{ character.clothing }}</div>
            <div v-if="character.accessories"><span class="text-zinc-500">配饰:</span> {{ character.accessories }}</div>
            <div v-if="character.special_marks"><span class="text-zinc-500">特征:</span> {{ character.special_marks }}</div>
        </div>

        <!-- 关系 -->
        <div v-if="character.relationships?.length" class="text-xs">
            <span class="text-zinc-500">关系:</span>
            <span
                v-for="(rel, i) in character.relationships"
                :key="i"
                class="ml-1 inline-flex items-center gap-0.5 bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-300"
            >
                {{ rel.targetName }}({{ rel.relation }})
            </span>
        </div>

        <!-- Visual Summary -->
        <div v-if="character.visual_summary" class="text-xs text-zinc-500 border-t border-zinc-700/50 pt-2 italic">
            {{ character.visual_summary }}
        </div>
    </div>
</template>
