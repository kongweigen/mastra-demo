import { Agent } from '@mastra/core/agent'
import { llm } from '../config/model'
import { memory } from '../config/memory'
import { directorAgent } from './director'
import { artDesignerAgent } from './art-designer'
import { narratorDirectorAgent } from './narrator-director'
import { narratorStoryboardArtistAgent } from './narrator-storyboard-artist'
import { productionCoordinatorAgent } from './production-coordinator'
import { storyboardArtistAgent } from './storyboard-artist'

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

路由规则：
- 剧本分析 / 剧情拆解 / 讲戏 / 审核 → 委派给导演
- 人物设定 / 场景设计 / 服化道 / 美术 → 委派给服化道设计师
- 解说词 / 第一人称 / 旁白 / 解说剧 → 委派给解说导演
- 解说分镜 / 解说脚本 / 旁白画面同步 → 委派给解说分镜师
- 制作清单 / 任务整合 / 录音需求 / 视频生成任务 → 委派给制作统筹
- 分镜 / Seedance / 动态提示词 / 视频脚本 → 委派给分镜师
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
    },
})
