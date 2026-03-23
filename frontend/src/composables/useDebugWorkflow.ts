import { reactive, ref } from 'vue'
import { useAgentCall } from './useAgentCall'
import type {
    WorkflowState,
    AgentCallState,
    ScriptWriterOutput,
    ExtractionOutput,
    StyleAnalysis,
    PromptEngineerOutput,
    StoryboardOutput,
    VideoModel,
} from '@/types/debug'

/** 创建初始 AgentCallState */
function emptyCallState(): AgentCallState {
    return {
        status: 'idle',
        thinkBlocks: [],
        currentThink: '',
        toolCalls: [],
        textContent: '',
        rawOutput: '',
        parsedJson: null,
        error: null,
    }
}

export function useDebugWorkflow() {
    const { callAgent } = useAgentCall()

    const state = reactive<WorkflowState>({
        scriptInput: '',
        rewrittenScript: null,
        extraction: null,
        style: null,
        characterPrompts: [],
        scenePrompts: [],
        storyboard: null,
        videoModel: 'kling-v3-omni',
        activeTab: 'extraction',
        callStates: {},
        instructionOverrides: {},
    })

    /** 当前正在执行的步骤 key */
    const activeCallKey = ref<string | null>(null)

    /** 获取步骤的调用状态 (响应式) */
    function getCallState(key: string): AgentCallState {
        if (!state.callStates[key]) {
            state.callStates[key] = emptyCallState()
        }
        return state.callStates[key]
    }

    /** 通用执行 — 调用 agent 并同步状态 */
    async function executeStep(
        key: string,
        agentId: string,
        message: string,
    ): Promise<AgentCallState> {
        // 重置该步骤状态
        state.callStates[key] = emptyCallState()
        activeCallKey.value = key

        const override = state.instructionOverrides[agentId]
        const result = await callAgent(agentId, message, override ? { instructionsOverride: override } : undefined)

        // 将 result 同步到 state.callStates (reactive proxy)
        Object.assign(state.callStates[key], result)
        activeCallKey.value = null
        return state.callStates[key]
    }

    // ─── Step 1: 剧本改写 ────────────────────────────

    async function runScriptRewrite() {
        if (!state.scriptInput.trim()) return
        state.activeTab = 'rewrite'

        const cs = await executeStep('rewrite', 'script-writer', state.scriptInput)
        if (cs.parsedJson) {
            state.rewrittenScript = cs.parsedJson as ScriptWriterOutput
        }
    }

    // ─── Step 2: 角色 & 场景提取 ─────────────────────

    async function runExtraction() {
        if (!state.scriptInput.trim()) return
        state.activeTab = 'extraction'

        const message = `## 剧本内容\n\n${state.scriptInput}`
        const cs = await executeStep('extraction', 'character-scene-extractor', message)
        if (cs.parsedJson) {
            state.extraction = cs.parsedJson as ExtractionOutput
        }
    }

    // ─── Step 2: 风格分析 ────────────────────────────

    async function runStyleAnalysis() {
        if (!state.scriptInput.trim()) return
        state.activeTab = 'extraction'

        const cs = await executeStep('style', 'style-analyzer', state.scriptInput)
        if (cs.parsedJson) {
            state.style = cs.parsedJson as StyleAnalysis
        }
    }

    // ─── Step 3: 角色生图提示词 ──────────────────────

    async function runCharacterPrompts() {
        if (!state.extraction?.characters?.length) return
        state.activeTab = 'prompts'

        const styleSummary = state.style?.summary ?? ''
        const message = [
            `媒体类型: image`,
            `目标模型: ${state.videoModel}`,
            `角色定妆照`,
            ``,
            `角色信息：`,
            JSON.stringify(state.extraction.characters, null, 2),
            ``,
            `项目风格: ${styleSummary}`,
        ].join('\n')

        const cs = await executeStep('characterPrompts', 'prompt-engineer', message)
        if (cs.parsedJson) {
            const output = cs.parsedJson as PromptEngineerOutput
            state.characterPrompts = output.prompts ?? []
        }
    }

    // ─── Step 3: 场景生图提示词 ──────────────────────

    async function runScenePrompts() {
        if (!state.extraction?.scenes?.length) return
        state.activeTab = 'prompts'

        const styleSummary = state.style?.summary ?? ''
        const message = [
            `媒体类型: image`,
            `目标模型: ${state.videoModel}`,
            `场景全景图`,
            ``,
            `场景信息：`,
            JSON.stringify(state.extraction.scenes, null, 2),
            ``,
            `项目风格: ${styleSummary}`,
        ].join('\n')

        const cs = await executeStep('scenePrompts', 'prompt-engineer', message)
        if (cs.parsedJson) {
            const output = cs.parsedJson as PromptEngineerOutput
            state.scenePrompts = output.prompts ?? []
        }
    }

    // ─── Step 4: 分镜提取 ────────────────────────────

    async function runStoryboard() {
        if (!state.scriptInput.trim()) return
        state.activeTab = 'storyboard'

        const characters = state.extraction?.characters ?? []
        const scenes = state.extraction?.scenes ?? []

        const message = [
            `当前视频模型: ${state.videoModel}`,
            ``,
            `## 剧本内容`,
            state.scriptInput,
            ``,
            `## 角色列表`,
            JSON.stringify(characters, null, 2),
            ``,
            `## 场景列表`,
            JSON.stringify(scenes, null, 2),
            ``,
            `可用生成模式: first_frame, last_frame`,
            `音频策略: voice_builtin`,
        ].join('\n')

        const cs = await executeStep('storyboard', 'storyboard-director', message)
        if (cs.parsedJson) {
            state.storyboard = cs.parsedJson as StoryboardOutput
        }
    }

    // ─── Agent/Skill 编辑 ─────────────────────────────

    /** 加载 agent 的原始 instructions */
    async function loadAgentInstructions(agentId: string): Promise<string> {
        const res = await fetch(`/api/debug/agent/${agentId}/instructions`)
        const data = await res.json()
        return data.instructions ?? ''
    }

    /** 设置 instructions 覆盖 */
    function setInstructionOverride(agentId: string, text: string) {
        state.instructionOverrides[agentId] = text
    }

    /** 清除 instructions 覆盖 (恢复原始) */
    function clearInstructionOverride(agentId: string) {
        delete state.instructionOverrides[agentId]
    }

    /** 加载 skill 列表 */
    async function loadSkillList(): Promise<string[]> {
        const res = await fetch('/api/debug/skills')
        const data = await res.json()
        return data.skills ?? []
    }

    /** 读取 skill 内容 */
    async function loadSkillContent(name: string): Promise<string> {
        const res = await fetch(`/api/debug/skill/${name}`)
        const data = await res.json()
        return data.content ?? ''
    }

    /** 保存 skill 内容 */
    async function saveSkillContent(name: string, content: string): Promise<boolean> {
        const res = await fetch(`/api/debug/skill/${name}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        })
        return res.ok
    }

    /** 设置视频模型 */
    function setVideoModel(model: VideoModel) {
        state.videoModel = model
    }

    /** 重置全部工作流状态 */
    function reset() {
        state.scriptInput = ''
        state.rewrittenScript = null
        state.extraction = null
        state.style = null
        state.characterPrompts = []
        state.scenePrompts = []
        state.storyboard = null
        state.activeTab = 'extraction'
        state.callStates = {}
        // 保留 instructionOverrides 和 videoModel
    }

    return {
        state,
        activeCallKey,
        getCallState,
        // 工作流步骤
        runScriptRewrite,
        runExtraction,
        runStyleAnalysis,
        runCharacterPrompts,
        runScenePrompts,
        runStoryboard,
        // 编辑功能
        loadAgentInstructions,
        setInstructionOverride,
        clearInstructionOverride,
        loadSkillList,
        loadSkillContent,
        saveSkillContent,
        // 其他
        setVideoModel,
        reset,
    }
}
