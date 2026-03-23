import { Agent } from '@mastra/core/agent'
import { llm } from '../config/model'
import { memory } from '../config/memory'
import { directorAgent } from './director'
import { artDesignerAgent } from './art-designer'
import { narratorDirectorAgent } from './narrator-director'
import { narratorStoryboardArtistAgent } from './narrator-storyboard-artist'
import { productionCoordinatorAgent } from './production-coordinator'
import { storyboardArtistAgent } from './storyboard-artist'
import { characterSceneExtractorAgent } from './character-scene-extractor'
import { promptEngineerAgent } from './prompt-engineer'
import { scriptWriterAgent } from './script-writer'
import { storyboardDirectorAgent } from './storyboard-director'
import { styleAnalyzerAgent } from './style-analyzer'
import { qualityGateCoordinatorAgent } from './quality-gate-coordinator'
import { retryCoordinatorAgent } from './retry-coordinator'
import { userCommandAgent } from './user-command'
import { voiceDirectorAgent } from './voice-director'

export const routerAgent = new Agent({
    id: 'router',
    name: '路由器',
    description: '将请求路由到最合适的专业智能体。',
    instructions: `你是一个路由智能体。分析用户的请求，将其委派给最合适的专业智能体。

可用智能体：
- **导演 (directorAgent)**：剧本分析、剧情拆解、导演讲戏、全阶段审核
- **服化道设计师 (artDesignerAgent)**：人物设定提示词、场景环境提示词设计
- **解说导演 (narratorDirectorAgent)**：剧本转解说词、解说词分析、两步审核
- **解说分镜师 (narratorStoryboardArtistAgent)**：解说词转 Seedance 2.0 分镜脚本
- **制作统筹 (productionCoordinatorAgent)**：整合解说词和分镜脚本为完整制作清单
- **分镜师 (storyboardArtistAgent)**：导演讲戏本转 Seedance 2.0 动态视频提示词
- **角色场景提取师 (characterSceneExtractorAgent)**：从剧本提取角色和场景信息、跨集去重合并
- **Prompt 工程师 (promptEngineerAgent)**：将分镜描述转化为 AI 图片/视频模型的高质量提示词
- **剧本编剧 (scriptWriterAgent)**：剧本转第一人称解说词、二创改写、润色
- **分镜导演 (storyboardDirectorAgent)**：根据视频模型特性将剧本拆解为分镜脚本
- **风格分析师 (styleAnalyzerAgent)**：从文本中提取内容风格（题材/氛围/色调/节奏）
- **质量关卡协调员 (qualityGateCoordinatorAgent)**：资产质量评审与关卡决策
- **重试协调员 (retryCoordinatorAgent)**：失败诊断、prompt 改写、模型降级策略
- **用户指令处理 (userCommandAgent)**：卡片响应、原创剧本创作、编辑操作、流程引导
- **配音导演 (voiceDirectorAgent)**：角色音色匹配与分配

路由规则：
- 剧本分析 / 剧情拆解 / 讲戏 / 审核 → 委派给导演
- 人物设定 / 场景设计 / 服化道 / 美术 → 委派给服化道设计师
- 解说词 / 第一人称 / 旁白 / 解说剧 → 委派给解说导演
- 解说分镜 / 解说脚本 / 旁白画面同步 → 委派给解说分镜师
- 制作清单 / 任务整合 / 录音需求 / 视频生成任务 → 委派给制作统筹
- 分镜 / Seedance / 动态提示词 / 视频脚本 → 委派给分镜师
- 角色提取 / 场景提取 / 去重合并 → 委派给角色场景提取师
- Prompt / 提示词工程 / 图片提示词 / 视频提示词 / 宫格图 → 委派给 Prompt 工程师
- 剧本改写 / 二创 / 润色 / 第一人称改写 → 委派给剧本编剧
- 分镜拆解 / 镜头拆分 / 模型适配分镜 → 委派给分镜导演
- 风格分析 / 内容风格 / 视觉氛围 → 委派给风格分析师
- 质量评审 / 质量检查 / 资产审核 → 委派给质量关卡协调员
- 失败重试 / 错误修复 / 模型降级 → 委派给重试协调员
- 写剧本 / 创作 / 编辑分镜 / 修改角色 / 项目状态 / 流程引导 → 委派给用户指令处理
- 配音 / 音色 / 声音匹配 / TTS → 委派给配音导演
- 如果不明确，直接给出有用的回答

始终委派给最合适的智能体。不要向用户解释你的路由逻辑。请用中文回复。`,
    model: llm,
    memory,
    agents: {
        directorAgent,
        artDesignerAgent,
        narratorDirectorAgent,
        narratorStoryboardArtistAgent,
        productionCoordinatorAgent,
        storyboardArtistAgent,
        characterSceneExtractorAgent,
        promptEngineerAgent,
        scriptWriterAgent,
        storyboardDirectorAgent,
        styleAnalyzerAgent,
        qualityGateCoordinatorAgent,
        retryCoordinatorAgent,
        userCommandAgent,
        voiceDirectorAgent,
    },
})
