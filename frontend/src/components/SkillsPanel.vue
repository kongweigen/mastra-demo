<script setup lang="ts">
import { ref, watch } from 'vue'

interface Skill {
    name: string
    description: string
    version?: string
    author?: string
    content: string
    references: string[]
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const skills = ref<Skill[]>([])
const expanded = ref<string | null>(null)
const loading = ref(false)

watch(
    () => props.open,
    async (isOpen) => {
        if (!isOpen) return
        loading.value = true
        try {
            const res = await fetch('/api/skills')
            const data = await res.json()
            skills.value = data.skills ?? []
        } catch {
            skills.value = []
        } finally {
            loading.value = false
        }
    },
)

function toggle(name: string) {
    expanded.value = expanded.value === name ? null : name
}
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div class="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-zinc-700 px-5 py-4">
                    <div>
                        <h2 class="text-lg font-semibold text-zinc-100">技能库</h2>
                        <p class="text-sm text-zinc-500">通过 BM25 匹配加载到智能体上下文的知识包</p>
                    </div>
                    <button
                        @click="emit('close')"
                        class="rounded-md px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                    >
                        关闭
                    </button>
                </div>

                <!-- Skills list -->
                <div class="overflow-y-auto p-5 space-y-3" style="max-height: calc(80vh - 80px)">
                    <p v-if="loading" class="text-sm text-zinc-500 animate-pulse">加载技能中...</p>
                    <p v-else-if="skills.length === 0" class="text-sm text-zinc-500">未在 workspace/skills/ 中找到技能</p>

                    <div v-for="skill in skills" :key="skill.name" class="rounded-lg border border-zinc-700 bg-zinc-800/50">
                        <button
                            @click="toggle(skill.name)"
                            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="font-medium text-zinc-200">{{ skill.name }}</span>
                                    <span v-if="skill.version" class="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                                        v{{ skill.version }}
                                    </span>
                                    <span v-if="skill.references.length > 0" class="rounded bg-blue-900/30 px-1.5 py-0.5 text-xs text-blue-400">
                                        {{ skill.references.length }} 个引用
                                    </span>
                                </div>
                                <p class="mt-1 text-sm text-zinc-500 truncate">{{ skill.description }}</p>
                            </div>
                            <span class="ml-2 text-zinc-500 text-sm">{{ expanded === skill.name ? '▾' : '▸' }}</span>
                        </button>

                        <div v-if="expanded === skill.name" class="border-t border-zinc-700 px-4 py-3">
                            <p v-if="skill.author" class="text-xs text-zinc-500 mb-2">作者：{{ skill.author }}</p>
                            <pre class="whitespace-pre-wrap text-sm text-zinc-300 bg-zinc-900 rounded p-3 overflow-x-auto max-h-64 overflow-y-auto">{{ skill.content }}</pre>
                            <div v-if="skill.references.length > 0" class="mt-3">
                                <p class="text-xs font-medium text-zinc-400 mb-1">参考文档：</p>
                                <div class="flex flex-wrap gap-1">
                                    <span v-for="r in skill.references" :key="r" class="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                                        {{ r }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>
