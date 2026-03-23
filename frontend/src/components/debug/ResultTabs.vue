<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WorkflowState } from '@/types/debug'
import ExecutionTrace from './ExecutionTrace.vue'
import CharacterCard from './CharacterCard.vue'
import SceneCard from './SceneCard.vue'
import StyleBadges from './StyleBadges.vue'
import EmotionCurve from './EmotionCurve.vue'
import PromptCard from './PromptCard.vue'
import ShotTimeline from './ShotTimeline.vue'
import RawJsonDrawer from './RawJsonDrawer.vue'

const props = defineProps<{
    state: WorkflowState
    activeCallKey: string | null
}>()

const emit = defineEmits<{
    (e: 'setTab', tab: WorkflowState['activeTab']): void
}>()

type TabDef = { key: WorkflowState['activeTab']; label: string }
const tabs: TabDef[] = [
    { key: 'extraction', label: '提取' },
    { key: 'rewrite', label: '改写' },
    { key: 'prompts', label: '提示词' },
    { key: 'storyboard', label: '分镜' },
]

/** 当前活动步骤的 callState (用于 ExecutionTrace) */
const activeCallState = computed(() => {
    if (props.activeCallKey && props.state.callStates[props.activeCallKey]) {
        return props.state.callStates[props.activeCallKey]
    }
    // 如果没有活跃调用，显示当前 tab 对应的最新调用
    const key = props.state.activeTab === 'extraction' ? 'extraction'
        : props.state.activeTab === 'rewrite' ? 'rewrite'
        : props.state.activeTab === 'prompts' ? 'characterPrompts'
        : 'storyboard'
    return props.state.callStates[key] ?? null
})

/** Raw JSON drawer 状态 */
const drawerVisible = ref(false)
const drawerTitle = ref('')
const drawerRaw = ref('')
const drawerJson = ref<any>(null)

function openDrawer(title: string, callKey: string) {
    const cs = props.state.callStates[callKey]
    if (!cs) return
    drawerTitle.value = title
    drawerRaw.value = cs.rawOutput
    drawerJson.value = cs.parsedJson
    drawerVisible.value = true
}
</script>

<template>
    <div class="flex flex-col h-full">
        <!-- Tab 栏 -->
        <div class="flex border-b border-zinc-800 px-3">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                class="px-4 py-2 text-sm border-b-2 -mb-px transition-colors"
                :class="state.activeTab === tab.key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'"
                @click="emit('setTab', tab.key)"
            >{{ tab.label }}</button>
        </div>

        <!-- ExecutionTrace (固定在 tab 内容上方) -->
        <div v-if="activeCallState" class="px-3 pt-3">
            <ExecutionTrace :call-state="activeCallState" />
        </div>

        <!-- Tab 内容 -->
        <div class="flex-1 overflow-y-auto p-3 space-y-4">
            <!-- 提取 Tab -->
            <template v-if="state.activeTab === 'extraction'">
                <!-- 角色 -->
                <div v-if="state.extraction?.characters?.length">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-medium text-zinc-300">角色 ({{ state.extraction.characters.length }})</h3>
                        <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="openDrawer('角色&场景', 'extraction')">查看原始数据</button>
                    </div>
                    <div class="grid gap-3 grid-cols-1 xl:grid-cols-2">
                        <CharacterCard v-for="(c, i) in state.extraction.characters" :key="i" :character="c" />
                    </div>
                </div>

                <!-- 场景 -->
                <div v-if="state.extraction?.scenes?.length">
                    <h3 class="text-sm font-medium text-zinc-300 mb-2">场景 ({{ state.extraction.scenes.length }})</h3>
                    <div class="grid gap-3 grid-cols-1 xl:grid-cols-2">
                        <SceneCard v-for="(s, i) in state.extraction.scenes" :key="i" :scene="s" />
                    </div>
                </div>

                <!-- 风格 -->
                <div v-if="state.style">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-medium text-zinc-300">风格分析</h3>
                        <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="openDrawer('风格', 'style')">查看原始数据</button>
                    </div>
                    <StyleBadges :style="state.style" />
                </div>

                <!-- 空状态 -->
                <div
                    v-if="!state.extraction && !state.style && !activeCallState"
                    class="text-center text-zinc-600 py-12"
                >
                    点击左侧「提取角色&amp;场景」或「分析风格」开始
                </div>
            </template>

            <!-- 改写 Tab -->
            <template v-if="state.activeTab === 'rewrite'">
                <div v-if="state.rewrittenScript">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-medium text-zinc-300">改写结果</h3>
                        <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="openDrawer('改写', 'rewrite')">查看原始数据</button>
                    </div>
                    <!-- 解说词内容 -->
                    <div class="bg-zinc-900 rounded-lg border border-zinc-700 p-3 text-sm text-zinc-300 whitespace-pre-wrap mb-4 max-h-[40vh] overflow-y-auto">
                        {{ state.rewrittenScript.content }}
                    </div>
                    <!-- 情感曲线 -->
                    <div v-if="state.rewrittenScript.emotionCurve?.length">
                        <h3 class="text-sm font-medium text-zinc-300 mb-2">情感曲线</h3>
                        <div class="bg-zinc-900 rounded-lg border border-zinc-700 p-2">
                            <EmotionCurve :points="state.rewrittenScript.emotionCurve" />
                        </div>
                    </div>
                </div>
                <div
                    v-else-if="!activeCallState"
                    class="text-center text-zinc-600 py-12"
                >
                    点击左侧「改写剧本」开始
                </div>
            </template>

            <!-- 提示词 Tab -->
            <template v-if="state.activeTab === 'prompts'">
                <div v-if="state.characterPrompts.length">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-medium text-zinc-300">角色提示词 ({{ state.characterPrompts.length }})</h3>
                        <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="openDrawer('角色提示词', 'characterPrompts')">查看原始数据</button>
                    </div>
                    <div class="grid gap-3 grid-cols-1 xl:grid-cols-2">
                        <PromptCard v-for="(p, i) in state.characterPrompts" :key="'cp-' + i" :prompt="p" :index="i" />
                    </div>
                </div>

                <div v-if="state.scenePrompts.length">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-medium text-zinc-300">场景提示词 ({{ state.scenePrompts.length }})</h3>
                        <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="openDrawer('场景提示词', 'scenePrompts')">查看原始数据</button>
                    </div>
                    <div class="grid gap-3 grid-cols-1 xl:grid-cols-2">
                        <PromptCard v-for="(p, i) in state.scenePrompts" :key="'sp-' + i" :prompt="p" :index="i" />
                    </div>
                </div>

                <div
                    v-if="!state.characterPrompts.length && !state.scenePrompts.length && !activeCallState"
                    class="text-center text-zinc-600 py-12"
                >
                    先提取角色/场景，再生成提示词
                </div>
            </template>

            <!-- 分镜 Tab -->
            <template v-if="state.activeTab === 'storyboard'">
                <div v-if="state.storyboard?.shots?.length">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-medium text-zinc-300">分镜时间线</h3>
                        <button class="text-xs text-zinc-500 hover:text-zinc-300" @click="openDrawer('分镜', 'storyboard')">查看原始数据</button>
                    </div>
                    <ShotTimeline :shots="state.storyboard.shots" />
                </div>
                <div
                    v-else-if="!activeCallState"
                    class="text-center text-zinc-600 py-12"
                >
                    点击左侧「生成分镜」开始
                </div>
            </template>
        </div>

        <!-- Raw JSON Drawer -->
        <RawJsonDrawer
            :visible="drawerVisible"
            :title="drawerTitle"
            :raw-text="drawerRaw"
            :parsed-json="drawerJson"
            @close="drawerVisible = false"
        />
    </div>
</template>
