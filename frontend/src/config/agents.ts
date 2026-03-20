export interface AgentConfig {
    id: string
    name: string
    description: string
    icon: string
}

export const AGENT_CONFIGS: AgentConfig[] = [
    { id: 'router', name: '路由器', description: '自动路由到最合适的专业智能体', icon: '🔀' },
    { id: 'director', name: '导演', description: '剧本分析、剧情拆解、导演讲戏、全阶段审核', icon: '🎬' },
    { id: 'art-designer', name: '服化道设计师', description: '设计人物设定提示词和场景环境提示词', icon: '🎨' },
    { id: 'narrator-director', name: '解说导演', description: '剧本转解说词、解说词分析、两步审核', icon: '🎙️' },
    { id: 'narrator-storyboard-artist', name: '解说分镜师', description: '解说词转 Seedance 2.0 分镜脚本', icon: '📐' },
    { id: 'production-coordinator', name: '制作统筹', description: '整合解说词和分镜脚本为完整制作清单', icon: '📋' },
    { id: 'storyboard-artist', name: '分镜师', description: '导演讲戏本转 Seedance 2.0 动态视频提示词', icon: '🖼️' },
]

export const DEFAULT_AGENT_ID = 'router'
