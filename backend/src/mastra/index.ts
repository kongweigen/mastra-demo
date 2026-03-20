import { Mastra } from '@mastra/core'
import { storage } from './config/storage'
import { mainWorkspace } from './config/workspace'
import {
    routerAgent,
    directorAgent,
    artDesignerAgent,
    narratorDirectorAgent,
    narratorStoryboardArtistAgent,
    productionCoordinatorAgent,
    storyboardArtistAgent,
} from './agents'

export const mastra = new Mastra({
    agents: {
        router: routerAgent,
        director: directorAgent,
        'art-designer': artDesignerAgent,
        'narrator-director': narratorDirectorAgent,
        'narrator-storyboard-artist': narratorStoryboardArtistAgent,
        'production-coordinator': productionCoordinatorAgent,
        'storyboard-artist': storyboardArtistAgent,
    },
    storage,
    workspace: mainWorkspace,
})

// 启动时打印 skill 发现日志
async function logSkillDiscovery() {
    try {
        const skills = mainWorkspace.skills
        if (!skills) {
            console.log('[Mastra] ⚠️  Workspace 未配置 skills')
            return
        }
        const list = await skills.list()
        console.log(`[Mastra] 🧩 发现 ${list.length} 个技能:`)
        for (const s of list) {
            console.log(`  - ${s.name}: ${s.description?.slice(0, 80) ?? '(无描述)'}`)
        }
        const agents = mastra.listAgents()
        const agentIds = Object.keys(agents)
        console.log(`[Mastra] ✅ 已注册 ${agentIds.length} 个 Agent: ${agentIds.join(', ')}`)
    } catch (e) {
        console.log('[Mastra] ⚠️  技能发现失败:', e instanceof Error ? e.message : e)
    }
}

logSkillDiscovery()
