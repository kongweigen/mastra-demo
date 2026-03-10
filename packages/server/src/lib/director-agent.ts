import { webcrypto } from 'node:crypto';
import { Agent } from '@mastra/core/agent';
import { CHATFIRE_CONFIG } from './chatfire.js';
import { installChatfireFetchLogging } from './llm-http-debug.js';
import { workspace } from './mastra.js';

if (!globalThis.crypto) {
  (globalThis as typeof globalThis & { crypto?: typeof webcrypto }).crypto = webcrypto;
}

installChatfireFetchLogging();

const DIRECTOR_AGENT_INSTRUCTIONS = `你是影视制作流程中的导演 Agent，负责剧本分析、服化道设计指导、Seedance 分镜提示词生成，以及各阶段的业务审核和合规审核。

工作方式：
- 你运行在一个启用了 workspace skills 的环境里。收到任务后，先根据任务类型调用对应的 skill 工具读取技能说明，再开始正式执行。
- 阶段一剧本分析优先读取 skill：director。
- 阶段二服化道设计优先读取 skill：art-design。
- 阶段三 Seedance 分镜提示词生成优先读取 skill：seedance-storyboard。
- 阶段一审核优先读取 skill：script-analysis-review。
- 阶段二审核优先读取 skill：art-direction-review。
- 阶段三审核优先读取 skill：seedance-prompt-review。
- 只要任务涉及平台限制、真人、版权 IP、政治安全、敏感内容等风险，同时读取 compliance-review。
- 如果 skill 中提到 references、scripts、assets 等补充材料，继续使用 skill_read 按需读取。
- 最终输出必须严格遵循已读取 skill 里的格式和约束。
- 始终使用中文输出，除非任务明确要求别的语言。

执行要求：
- 先理解任务，再选择最少但足够的 skills。
- 不要凭记忆复述 skill 内容；需要时重新调用 skill 工具。
- 如果一个任务同时包含“执行”和“审核”，先完成执行，再基于审核 skill 进行审查。
- 输出只保留任务结果本身，不解释内部工具调用过程。`;

export const directorAgent = new Agent({
  id: 'director-agent',
  name: 'Director Agent',
  description: '影视制作导演 Agent，自动调用 workspace skills 完成执行与审核任务。',
  instructions: DIRECTOR_AGENT_INSTRUCTIONS,
  model: () => ({
    id: `chatfire/${CHATFIRE_CONFIG.model}`,
    url: `${CHATFIRE_CONFIG.baseUrl}/v1`,
    apiKey: CHATFIRE_CONFIG.apiKey,
  }),
  workspace,
});

export async function logDirectorAgentStatus(context = 'startup') {
  try {
    const tools = await directorAgent.listTools();
    const toolNames = Object.keys(tools).sort();
    const hasWorkspace = Boolean(await directorAgent.getWorkspace());
    console.info(
      `[Mastra][${context}] directorAgent model=${CHATFIRE_CONFIG.model} hasWorkspace=${hasWorkspace} staticToolCount=${toolNames.length} staticTools=${toolNames.join(', ') || 'none'} note=listTools() does not include runtime-injected workspace/skill tools`
    );
  } catch (error) {
    console.error(`[Mastra][${context}] failed to inspect director agent tools`, error);
  }
}
