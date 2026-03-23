<script setup lang="ts">
import { computed } from 'vue'
import { useDebugWorkflow } from '@/composables/useDebugWorkflow'
import ScriptInputPanel from './ScriptInputPanel.vue'
import ResultTabs from './ResultTabs.vue'

const workflow = useDebugWorkflow()

const isRunning = computed(() => !!workflow.activeCallKey.value)
</script>

<template>
    <div class="flex h-full">
        <!-- 左列 -->
        <div class="w-[40%] min-w-[320px] border-r border-zinc-800 overflow-y-auto">
            <ScriptInputPanel
                :state="workflow.state"
                :is-running="isRunning"
                @update:script-input="workflow.state.scriptInput = $event"
                @rewrite="workflow.runScriptRewrite()"
                @extract="workflow.runExtraction()"
                @style="workflow.runStyleAnalysis()"
                @character-prompts="workflow.runCharacterPrompts()"
                @scene-prompts="workflow.runScenePrompts()"
                @storyboard="workflow.runStoryboard()"
                @set-video-model="workflow.setVideoModel($event)"
                @override-instructions="(agentId: string, text: string) => workflow.setInstructionOverride(agentId, text)"
                @clear-instructions="(agentId: string) => workflow.clearInstructionOverride(agentId)"
                @reset="workflow.reset()"
            />
        </div>

        <!-- 右列 -->
        <div class="flex-1 overflow-hidden">
            <ResultTabs
                :state="workflow.state"
                :active-call-key="workflow.activeCallKey.value"
                @set-tab="workflow.state.activeTab = $event"
            />
        </div>
    </div>
</template>
