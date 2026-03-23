import { Hono } from 'hono'

export const agentsRoute = new Hono()

/** 返回可用智能体列表（前端用于渲染下拉菜单） */
agentsRoute.get('/api/agents', (c) => {
    return c.json({
        agents: [
            { id: 'router', name: '路由器', description: '自动路由到最合适的专业智能体', icon: '🔀' },
            { id: 'director', name: '导演', description: '剧本分析、剧情拆解、导演讲戏、全阶段审核', icon: '🎬' },
            { id: 'art-designer', name: '服化道设计师', description: '设计人物设定提示词和场景环境提示词', icon: '🎨' },
            { id: 'narrator-director', name: '解说导演', description: '剧本转解说词、解说词分析、两步审核', icon: '🎙️' },
            { id: 'narrator-storyboard-artist', name: '解说分镜师', description: '解说词转 Seedance 2.0 分镜脚本', icon: '📐' },
            { id: 'production-coordinator', name: '制作统筹', description: '整合解说词和分镜脚本为完整制作清单', icon: '📋' },
            { id: 'storyboard-artist', name: '分镜师', description: '导演讲戏本转 Seedance 2.0 动态视频提示词', icon: '🖼️' },
            { id: 'character-scene-extractor', name: '角色场景提取师', description: '从剧本提取角色和场景信息、跨集去重合并', icon: '🔍' },
            { id: 'prompt-engineer', name: 'Prompt 工程师', description: '将分镜描述转化为 AI 模型高质量提示词', icon: '✨' },
            { id: 'script-writer', name: '剧本编剧', description: '剧本转第一人称解说词、二创改写、润色', icon: '✍️' },
            { id: 'storyboard-director', name: '分镜导演', description: '根据视频模型特性将剧本拆解为分镜脚本', icon: '🎞️' },
            { id: 'style-analyzer', name: '风格分析师', description: '从文本提取内容风格（题材/氛围/色调/节奏）', icon: '🎭' },
            { id: 'quality-gate-coordinator', name: '质量关卡协调员', description: '资产质量评审与关卡决策', icon: '✅' },
            { id: 'retry-coordinator', name: '重试协调员', description: '失败诊断、prompt 改写、模型降级策略', icon: '🔄' },
            { id: 'user-command', name: '用户指令处理', description: '卡片响应、原创创作、编辑操作、流程引导', icon: '💬' },
            { id: 'voice-director', name: '配音导演', description: '角色音色匹配与分配', icon: '🎤' },
        ],
    })
})
