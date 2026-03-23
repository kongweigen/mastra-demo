// ─── Agent 输出类型 ──────────────────────────────

/** script-writer 输出 */
export interface ScriptWriterOutput {
    content: string
    emotionCurve: EmotionPoint[]
}

export interface EmotionPoint {
    position: number // 0.0-1.0
    emotion: string  // tension/curiosity/conflict/romance/sad/neutral/happy/angry/fear/surprise
    score: number    // 0-100
    keywords: string
}

/** character-scene-extractor 输出 */
export interface ExtractionOutput {
    characters: Character[]
    scenes: Scene[]
    character_name_mapping?: Record<string, string>
    scene_name_mapping?: Record<string, string>
}

export interface Character {
    name: string
    gender: string
    age: string
    role_type: 'PROTAGONIST' | 'SUPPORTING' | 'MINOR'
    body_type?: string
    skin_tone?: string
    face_features?: string
    hair_style?: string
    clothing?: string
    accessories?: string
    special_marks?: string
    visual_summary: string
    relationships?: { targetName: string; relation: string }[]
}

export interface Scene {
    name: string
    time_desc?: string
    location_desc?: string
    environment_desc: string
    visual_summary?: string
}

/** style-analyzer 输出 */
export interface StyleAnalysis {
    genre: string
    emotionalTone: string
    visualMood: string
    environmentKeywords: string
    pacing: string
    summary: string
}

/** prompt-engineer 输出 */
export interface PromptEngineerOutput {
    prompts: PromptResult[]
    summary?: string
}

export interface PromptResult {
    storyboardId?: string
    characterName?: string
    sceneName?: string
    engineeredPrompt: string
    negativePrompt?: string
    promptParams?: Record<string, any>
}

/** storyboard-director 输出 */
export interface StoryboardOutput {
    shots: Shot[]
}

export interface Shot {
    dialogue?: string
    speaker?: string
    action: string
    visual_prompt: string
    shot_type: string
    camera_movement: string
    duration: number
    characters: string[]
    scene: string
    group_id?: string
    group_index?: number
    image_mode?: string
    gen_mode?: string
    audio_type?: string
    voices?: any[]
    emotion?: string
    need_shot_image?: boolean
    need_character_ref?: boolean
    need_scene_ref?: boolean
}

// ─── 流式调用状态 ─────────────────────────────────

export interface ToolCallEvent {
    id: string
    toolName: string
    state: 'pending' | 'complete' | 'result'
    args?: any
    result?: any
}

export interface AgentCallState {
    status: 'idle' | 'streaming' | 'done' | 'error'
    thinkBlocks: string[]
    currentThink: string
    toolCalls: ToolCallEvent[]
    textContent: string
    rawOutput: string
    parsedJson: any | null
    error: string | null
}

// ─── 工作流状态 ───────────────────────────────────

export type VideoModel = 'kling-v3-omni' | 'seedance-2' | 'seedance-1.5-pro'

export interface WorkflowState {
    scriptInput: string
    rewrittenScript: ScriptWriterOutput | null
    extraction: ExtractionOutput | null
    style: StyleAnalysis | null
    characterPrompts: PromptResult[]
    scenePrompts: PromptResult[]
    storyboard: StoryboardOutput | null
    videoModel: VideoModel
    activeTab: 'rewrite' | 'extraction' | 'prompts' | 'storyboard'
    /** 每步的调用状态 */
    callStates: Record<string, AgentCallState>
    /** Agent instructions 覆盖 (agentId → 修改后文本) */
    instructionOverrides: Record<string, string>
}
