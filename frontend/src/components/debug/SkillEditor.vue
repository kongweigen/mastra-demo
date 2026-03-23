<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
    (e: 'saved', name: string): void
}>()

const skillList = ref<string[]>([])
const selectedSkill = ref('')
const editContent = ref('')
const loading = ref(false)
const saving = ref(false)
const saveMsg = ref('')
const expanded = ref(false)

onMounted(async () => {
    try {
        const res = await fetch('/api/debug/skills')
        const data = await res.json()
        skillList.value = data.skills ?? []
    } catch { /* ignore */ }
})

async function loadSkill(name: string) {
    if (!name) return
    loading.value = true
    saveMsg.value = ''
    try {
        const res = await fetch(`/api/debug/skill/${name}`)
        const data = await res.json()
        editContent.value = data.content ?? ''
    } finally {
        loading.value = false
    }
}

async function handleSave() {
    if (!selectedSkill.value) return
    saving.value = true
    saveMsg.value = ''
    try {
        const res = await fetch(`/api/debug/skill/${selectedSkill.value}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editContent.value }),
        })
        if (res.ok) {
            saveMsg.value = '已保存'
            emit('saved', selectedSkill.value)
        } else {
            saveMsg.value = '保存失败'
        }
    } finally {
        saving.value = false
        setTimeout(() => { saveMsg.value = '' }, 3000)
    }
}
</script>

<template>
    <div class="border-t border-zinc-800 pt-3">
        <button
            class="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 w-full"
            @click="expanded = !expanded"
        >
            <span>{{ expanded ? '▾' : '▸' }}</span>
            <span class="font-medium">Skill 编辑</span>
            <span class="ml-auto text-zinc-600 text-xs">{{ skillList.length }} 个</span>
        </button>

        <div v-if="expanded" class="mt-2 space-y-2">
            <select
                v-model="selectedSkill"
                class="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-200"
                @change="loadSkill(selectedSkill)"
            >
                <option value="">选择 Skill…</option>
                <option v-for="s in skillList" :key="s" :value="s">{{ s }}</option>
            </select>

            <div v-if="loading" class="text-xs text-zinc-500 animate-pulse">加载中...</div>

            <template v-if="selectedSkill && !loading">
                <textarea
                    v-model="editContent"
                    class="w-full h-48 rounded bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 font-mono resize-y"
                    placeholder="SKILL.md content..."
                />
                <div class="flex items-center gap-2">
                    <button
                        class="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 text-xs text-white"
                        :disabled="saving"
                        @click="handleSave"
                    >
                        {{ saving ? '保存中...' : '保存 Skill' }}
                    </button>
                    <span
                        v-if="saveMsg"
                        class="text-xs"
                        :class="saveMsg === '已保存' ? 'text-green-400' : 'text-red-400'"
                    >{{ saveMsg }}</span>
                </div>
                <p class="text-xs text-zinc-600">
                    保存后 agent 下次调用 loadSkill 时自动加载最新内容
                </p>
            </template>
        </div>
    </div>
</template>
