import { webcrypto } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { Agent } from '@mastra/core/agent';
import { CHATFIRE_CONFIG } from './chatfire.js';
import { installChatfireFetchLogging, withLlmDebugContext } from './llm-http-debug.js';
import { getManagedSkill, type ManagedAgent } from './studio-config.js';

if (!globalThis.crypto) {
  (globalThis as typeof globalThis & { crypto?: typeof webcrypto }).crypto = webcrypto;
}

installChatfireFetchLogging();

export type ManagedAgentRunOptions = {
  prompt: string;
  phaseLabel: string;
  responseFormatHint?: string;
  mountedSkillNames?: string[];
};

export type ManagedAgentJsonEnvelope = {
  schemaVersion: 1;
  phase: 1 | 2 | 3;
  step: 'execute' | 'business_review' | 'compliance_review';
  result: 'OK' | 'PASS' | 'FAIL' | 'ERROR';
  summary: string;
  issues: any[];
  data: any;
  raw: any;
  rawText: string;
};

function stripCodeFences(text: string) {
  return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function createRuntimeAgent(agent: ManagedAgent) {
  return new Agent({
    id: agent.key,
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    model: () => ({
      id: `chatfire/${CHATFIRE_CONFIG.model}`,
      url: `${CHATFIRE_CONFIG.baseUrl}/v1`,
      apiKey: CHATFIRE_CONFIG.apiKey,
    }),
  });
}

async function buildMountedSkillsPrompt(agent: ManagedAgent, mountedSkillNames?: string[]) {
  const skillNames = mountedSkillNames && mountedSkillNames.length > 0 ? mountedSkillNames : agent.skillNames;
  const sections = await Promise.all(
    skillNames.map(async (skillName) => {
      const skill = await getManagedSkill(skillName);
      if (!skill) {
        return '';
      }

      return `## Skill: ${skill.name}\nDescription: ${skill.description}\n\n${skill.instructions}`;
    })
  );

  return sections.filter(Boolean).join('\n\n');
}

export async function runManagedAgent(agent: ManagedAgent, options: ManagedAgentRunOptions) {
  if (!CHATFIRE_CONFIG.apiKey) {
    throw new Error('CHATFIRE_API_KEY is not set. Please configure your API key.');
  }

  const requestId = randomUUID().slice(0, 8);
  const effectiveSkills =
    options.mountedSkillNames && options.mountedSkillNames.length > 0 ? options.mountedSkillNames : agent.skillNames;
  const mountedSkillsPrompt = await buildMountedSkillsPrompt(agent, effectiveSkills);
  const startedAt = Date.now();
  const heartbeat = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    console.info(
      `[ManagedAgent:${requestId}] waiting elapsed=${elapsedSeconds}s agent=${agent.key} phase=${options.phaseLabel} model=${CHATFIRE_CONFIG.model}`
    );
  }, 15_000);

  const system = [
    agent.instructions.trim(),
    '你只能依据下列已挂载 skills 工作，不要臆造额外规范。',
    mountedSkillsPrompt,
    options.responseFormatHint ? `输出要求：${options.responseFormatHint}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  console.info(
    `[ManagedAgent:${requestId}] start agent=${agent.key} phase=${options.phaseLabel} model=${CHATFIRE_CONFIG.model} skills=${effectiveSkills.join(', ')} promptLength=${options.prompt.length} systemLength=${system.length}`
  );

  try {
    const runtimeAgent = createRuntimeAgent(agent);
    const response = await withLlmDebugContext(
      {
        requestId,
        skill: agent.skillNames.join(','),
        retryWithoutTools: false,
      },
      () =>
        runtimeAgent.generate(options.prompt, {
          system,
          abortSignal: AbortSignal.timeout(CHATFIRE_CONFIG.timeoutMs),
          timeout: {
            totalMs: CHATFIRE_CONFIG.timeoutMs,
            stepMs: CHATFIRE_CONFIG.stepTimeoutMs,
          },
        } as any)
    );

    console.info(
      `[ManagedAgent:${requestId}] finish agent=${agent.key} phase=${options.phaseLabel} textLength=${response.text?.length || 0} finishReason=${response.finishReason || 'unknown'}`
    );

    if (!response.text?.trim()) {
      throw new Error(`Managed agent "${agent.key}" returned empty response`);
    }

    return response.text;
  } finally {
    clearInterval(heartbeat);
  }
}

export async function runManagedAgentJson(
  agent: ManagedAgent,
  options: ManagedAgentRunOptions & { envelope: Pick<ManagedAgentJsonEnvelope, 'phase' | 'step'> }
): Promise<ManagedAgentJsonEnvelope> {
  const contract = `你必须只输出一个 JSON 对象(不要 markdown/不要代码块)，并严格满足以下结构：
{
  "schemaVersion": 1,
  "phase": ${options.envelope.phase},
  "step": "${options.envelope.step}",
  "result": "OK|PASS|FAIL|ERROR",
  "summary": "一句话总结(无则空字符串)",
  "issues": [],
  "data": {},
  "raw": {},
  "rawText": "把你最终的原始输出(如果你已经输出JSON也要保留一份字符串)"
}
要求：
1) 最外层必须是对象，字段必须齐全；没有内容也要给空字符串/空数组/空对象。
2) 如果无法完全结构化，把主要内容放入 data.rawOutput，同时 rawText 仍要保留。
3) 不要输出任何额外文字。`;

  const firstText = await runManagedAgent(agent, { ...options, prompt: `${options.prompt}\n\n${contract}`.trim() });
  const cleaned = stripCodeFences(firstText);
  const jsonCandidate = extractFirstJsonObject(cleaned) || cleaned;

  const toEnvelope = (parsed: any, _rawText: string): ManagedAgentJsonEnvelope => ({
    schemaVersion: 1,
    phase: options.envelope.phase,
    step: options.envelope.step,
    result: (parsed?.result as any) || 'OK',
    summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
    issues: Array.isArray(parsed?.issues) ? parsed.issues : [],
    data: parsed?.data ?? {},
    raw: parsed?.raw ?? parsed ?? {},
    rawText: '', // 成功时不返回原始文本，节省上下文
  });

  try {
    return toEnvelope(JSON.parse(jsonCandidate), firstText);
  } catch (error) {
    const secondText = await runManagedAgent(agent, {
      ...options,
      prompt: `${options.prompt}\n\n你上次输出不是可解析的 JSON。现在只输出符合结构的 JSON 对象，不要任何解释。\n\n${contract}`.trim(),
    });
    const secondCleaned = stripCodeFences(secondText);
    const secondCandidate = extractFirstJsonObject(secondCleaned) || secondCleaned;
    try {
      return toEnvelope(JSON.parse(secondCandidate), secondText);
    } catch {
      return {
        schemaVersion: 1,
        phase: options.envelope.phase,
        step: options.envelope.step,
        result: 'ERROR',
        summary: 'JSON_PARSE_ERROR',
        issues: [],
        data: { rawOutput: secondText || firstText },
        raw: { parseError: String(error) },
        rawText: secondText || firstText,
      };
    }
  }
}
