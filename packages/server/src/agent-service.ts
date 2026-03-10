import * as db from './db/index.js';
import { randomUUID } from 'node:crypto';
import { emitEvent } from './routes/sse.js';
import { CHATFIRE_CONFIG } from './lib/chatfire.js';
import { directorAgent } from './lib/director-agent.js';
import { withLlmDebugContext } from './lib/llm-http-debug.js';

// ============================================
// Mastra Director Agent
// ============================================

// 任务提示映射 - 实际 skill 由 Mastra Agent 自动调用
const SKILL_HINTS: Record<string, string[]> = {
  directorSkill: ['director'],
  artDesignSkill: ['art-design'],
  seedanceStoryboardSkill: ['seedance-storyboard'],
  scriptAnalysisReviewSkill: ['script-analysis-review', 'compliance-review'],
  artDirectionReviewSkill: ['art-direction-review', 'compliance-review'],
  seedancePromptReviewSkill: ['seedance-prompt-review', 'compliance-review'],
  complianceReviewSkill: ['compliance-review'],
};

function buildSkillHintSystem(skill?: string): string | undefined {
  if (!skill || !SKILL_HINTS[skill]?.length) {
    return undefined;
  }

  const skills = SKILL_HINTS[skill];

  return `本次任务开始前，请优先调用 workspace skill 工具读取以下 skills：${skills.join(', ')}。
如果任务中出现平台内容限制、真人肖像、版权 IP、政治安全或其他合规风险，也必须读取 compliance-review。
读取完成后，再按照 skill 要求输出最终结果。
如果已经拿到足够信息，最后一步必须直接输出文本答案，不要停在新的工具调用上。`;
}

function summarizeSteps(steps: any[] = []) {
  return steps.map((step, index) => ({
    index,
    finishReason: step?.finishReason,
    textLength: typeof step?.text === 'string' ? step.text.length : 0,
    toolCalls: (step?.toolCalls || []).map((toolCall: any) => ({
      toolName: toolCall?.toolName || toolCall?.dynamic?.toolName || toolCall?.type,
      args: toolCall?.args || toolCall?.dynamic?.args || null,
    })),
    toolResults: (step?.toolResults || []).map((toolResult: any) => ({
      toolName: toolResult?.toolName || toolResult?.dynamic?.toolName || null,
      isError: Boolean(toolResult?.error),
    })),
  }));
}

async function generateWithDiagnostics(prompt: string, skill: string | undefined, retryWithoutTools = false) {
  const requestId = randomUUID().slice(0, 8);
  const hintedSkills = skill ? SKILL_HINTS[skill] || [] : [];
  const system = buildSkillHintSystem(skill);
  const startedAt = Date.now();
  const heartbeat = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    console.info(
      `[Mastra][runAgent:${requestId}] waiting elapsed=${elapsedSeconds}s model=${CHATFIRE_CONFIG.model} retryWithoutTools=${retryWithoutTools} skillKey=${skill || 'none'}`
    );
  }, 15_000);

  console.info(
    `[Mastra][runAgent:${requestId}] start model=${CHATFIRE_CONFIG.model} retryWithoutTools=${retryWithoutTools} skillKey=${skill || 'none'} hintedSkills=${hintedSkills.join(', ') || 'none'} promptLength=${prompt.length} timeoutMs=${CHATFIRE_CONFIG.timeoutMs} stepTimeoutMs=${CHATFIRE_CONFIG.stepTimeoutMs} transportTimeoutMs=${CHATFIRE_CONFIG.transportTimeoutMs}`
  );

  try {
    const response = await withLlmDebugContext(
      {
        requestId,
        skill,
        retryWithoutTools,
      },
      () =>
        directorAgent.generate(
          prompt,
          {
            maxSteps: retryWithoutTools ? 4 : 8,
            system: retryWithoutTools
              ? `${system || ''}\n你已经读取过所需 skills。本次禁止调用任何工具，直接输出最终文本答案。`.trim()
              : system,
            abortSignal: AbortSignal.timeout(CHATFIRE_CONFIG.timeoutMs),
            timeout: {
              totalMs: CHATFIRE_CONFIG.timeoutMs,
              stepMs: CHATFIRE_CONFIG.stepTimeoutMs,
            },
            activeTools: retryWithoutTools ? [] : undefined,
            onStepFinish: ({ text, finishReason, toolCalls, toolResults }) => {
              console.info(
                `[Mastra][runAgent:${requestId}] stepFinish finishReason=${finishReason || 'unknown'} textLength=${text?.length || 0} toolCalls=${(toolCalls || []).length} toolResults=${(toolResults || []).length}`
              );
              if ((toolCalls || []).length > 0) {
                console.info(
                  `[Mastra][runAgent:${requestId}] stepToolCalls=${JSON.stringify(
                    (toolCalls || []).map((toolCall: any) => ({
                      toolName: toolCall?.toolName || toolCall?.dynamic?.toolName || toolCall?.type,
                      args: toolCall?.args || toolCall?.dynamic?.args || null,
                    }))
                  )}`
                );
              }
            },
          } as any
        )
    );

    console.info(
      `[Mastra][runAgent:${requestId}] finish model=${CHATFIRE_CONFIG.model} retryWithoutTools=${retryWithoutTools} textLength=${response.text?.length || 0} finishReason=${response.finishReason || 'unknown'} steps=${response.steps?.length || 0}`
    );
    console.info(`[Mastra][runAgent:${requestId}] steps=${JSON.stringify(summarizeSteps(response.steps || []))}`);

    return response;
  } finally {
    clearInterval(heartbeat);
  }
}

// 调用 Agent 的辅助函数
async function runAgent(prompt: string, skill?: string): Promise<string> {
  if (!CHATFIRE_CONFIG.apiKey) {
    throw new Error('CHATFIRE_API_KEY is not set. Please configure your API key.');
  }

  try {
    let response = await generateWithDiagnostics(prompt, skill);

    if (!response.text?.trim()) {
      console.warn('[Mastra][runAgent] empty text response detected, retrying once without tools');
      response = await generateWithDiagnostics(prompt, skill, true);
    }

    if (!response.text?.trim()) {
      throw new Error(
        `Mastra agent returned empty text response. finishReason=${response.finishReason || 'unknown'} steps=${response.steps?.length || 0}`
      );
    }

    return response.text;
  } catch (error) {
    console.error('Mastra agent call error:', error);
    throw error;
  }
}

export type PhaseType = 1 | 2 | 3;

interface PhaseConfig {
  name: string;
  execute: (projectId: string, input: any) => Promise<any>;
  review: (output: any) => Promise<{ 审核结果: string; 通过原因?: string; 问题列表?: any[] }>;
}

type ReviewSection = {
  result: 'PASS' | 'FAIL';
  summary: string;
  details: any[];
  raw: any;
};

type ReviewPayload = {
  business?: ReviewSection;
  compliance?: ReviewSection;
  latestStage?: 'business' | 'compliance';
};

function extractTextCandidates(raw: any): string[] {
  if (!raw) {
    return [];
  }

  if (typeof raw === 'string') {
    return [raw];
  }

  if (typeof raw !== 'object') {
    return [String(raw)];
  }

  return Object.values(raw)
    .flatMap((value) => extractTextCandidates(value))
    .filter(Boolean);
}

function inferReviewResult(raw: any): 'PASS' | 'FAIL' {
  const directCandidates = [
    raw?.审核结果,
    raw?.result,
    raw?.status,
    raw?.结论,
    raw?.业务审核,
    raw?.合规审核,
  ]
    .filter((value) => typeof value === 'string')
    .map((value) => String(value).toUpperCase());

  if (directCandidates.some((value) => value.includes('FAIL'))) {
    return 'FAIL';
  }

  if (directCandidates.some((value) => value.includes('PASS'))) {
    return 'PASS';
  }

  const text = extractTextCandidates(raw).join('\n');
  const normalized = text.toUpperCase();

  const failPatterns = [
    /业务审核[:：]\s*FAIL/,
    /合规审核[:：]\s*FAIL/,
    /审核结果[:：]\s*FAIL/,
    /\bFAIL\b/,
    /未通过/,
    /不通过/,
    /需要修改/,
    /问题\d+[:：]/,
  ];

  if (failPatterns.some((pattern) => pattern.test(text) || pattern.test(normalized))) {
    return 'FAIL';
  }

  const passPatterns = [
    /业务审核[:：]\s*PASS/,
    /合规审核[:：]\s*PASS/,
    /审核结果[:：]\s*PASS/,
    /\bPASS\b/,
    /通过/,
    /合规/,
  ];

  if (passPatterns.some((pattern) => pattern.test(text) || pattern.test(normalized))) {
    return 'PASS';
  }

  return 'PASS';
}

function toList(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [value];
}

function summarizeReviewText(raw: any): string {
  if (!raw || typeof raw !== 'object') {
    return typeof raw === 'string' ? raw : '';
  }

  return (
    raw.通过原因 ||
    raw.结论 ||
    raw.建议 ||
    raw.审核意见 ||
    raw.说明 ||
    ''
  );
}

function parseReviewPayload(value: string | undefined): ReviewPayload {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildReviewSection(raw: any, detailKeys: string[]): ReviewSection {
  const details = detailKeys.flatMap((key) => toList(raw?.[key]));
  const summary = summarizeReviewText(raw) || (details.length > 0 ? JSON.stringify(details) : '');

  return {
    result: inferReviewResult(raw),
    summary,
    details,
    raw,
  };
}

function parseReviewResponse(reviewResult: string) {
  try {
    const jsonMatch = reviewResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object') {
        if (!parsed.审核结果) {
          parsed.审核结果 = inferReviewResult(parsed);
        }
        return parsed;
      }
    }
  } catch {
    // Fall through to text-based normalization below.
  }

  return {
    审核结果: inferReviewResult(reviewResult),
    通过原因: reviewResult,
    原始审核文本: reviewResult,
  };
}

function upsertReviewPayload(existing: string | undefined, stage: 'business' | 'compliance', section: ReviewSection) {
  const payload = parseReviewPayload(existing);
  payload[stage] = section;
  payload.latestStage = stage;
  return JSON.stringify(payload);
}

const phaseConfigs: Record<PhaseType, PhaseConfig> = {
  1: {
    name: '剧本分析（导演讲戏）',
    execute: async (_projectId: string, input: { script: string }) => {
      const result = await runAgent(
        `请根据以下剧本，输出导演分析结果：

剧本内容：
${input.script}

请按照导演技能的要求进行分析，输出：
1. 剧情拆解（按集分，每个剧情点一集）
2. 人物清单（需要生成参考图的角色）
3. 场景清单（需要生成参考图的场景）
4. 导演阐述（为每个剧情点讲戏）

严格按照 skill 中定义的格式输出。`,
        'directorSkill'
      );

      // 尝试解析 JSON，如果失败则尝试提取 JSON 部分
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return { rawOutput: result };
      } catch {
        return { rawOutput: result };
      }
    },
    review: async (output: any) => {
      const reviewResult = await runAgent(
        `请审核以下导演分析产出：

${JSON.stringify(output, null, 2)}

严格按照审核技能的要求进行审核，逐项评分，输出审核结果。`,
        'scriptAnalysisReviewSkill'
      );

      return parseReviewResponse(reviewResult);
    },
  },
  2: {
    name: '服化道设计',
    execute: async (_projectId: string, input: { analysis: any }) => {
      const result = await runAgent(
        `请根据以下导演分析产出，设计服化道方案：

导演分析：
${JSON.stringify(input.analysis, null, 2)}

请按照服化道技能的要求，设计：
1. 人物造型提示词（每个需要参考图的角色）
2. 场景环境提示词（宫格格式）

严格按照 skill 中定义的格式输出。`,
        'artDesignSkill'
      );

      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return { 服化道设计: result };
      } catch {
        return { 服化道设计: result };
      }
    },
    review: async (output: any) => {
      const reviewResult = await runAgent(
        `请审核以下服化道设计产出：

${JSON.stringify(output, null, 2)}

严格按照审核技能的要求进行审核，逐项评分。`,
        'artDirectionReviewSkill'
      );

      return parseReviewResponse(reviewResult);
    },
  },
  3: {
    name: '分镜生成（Seedance提示词）',
    execute: async (_projectId: string, input: { analysis: any; artDirection: any }) => {
      const result = await runAgent(
        `请根据以下信息，生成分镜 Seedance 提示词：

导演分析：
${JSON.stringify(input.analysis, null, 2)}

服化道设计：
${JSON.stringify(input.artDirection, null, 2)}

请按照分镜技能的要求，为每个分镜编写 Seedance 2.0 格式的动态视频提示词。

输出格式：
- 素材对应表
- 每个分镜的详细提示词

严格按照 skill 中定义的格式输出。`,
        'seedanceStoryboardSkill'
      );

      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return { 分镜列表: result };
      } catch {
        return { 分镜列表: result };
      }
    },
    review: async (output: any) => {
      const reviewResult = await runAgent(
        `请审核以下分镜提示词产出：

${JSON.stringify(output, null, 2)}

严格按照审核技能的要求进行审核，逐项评分。`,
        'seedancePromptReviewSkill'
      );

      return parseReviewResponse(reviewResult);
    },
  },
};

export async function runPhase(projectId: string, phaseNumber: PhaseType): Promise<void> {
  const config = phaseConfigs[phaseNumber];

  // 发送开始事件
  emitEvent(projectId, { type: 'phase_start', phase: phaseNumber });
  db.updateProjectStatus(projectId, 'running');

  try {
    // 获取项目数据
    const project = db.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // 获取之前阶段的数据作为输入
    let input: any = {};
    if (phaseNumber === 1) {
      input = { script: project.script };
    } else if (phaseNumber === 2) {
      const phase1 = db.getPhaseByNumber(projectId, 1);
      input = { analysis: phase1 ? JSON.parse(phase1.output_data) : {} };
    } else if (phaseNumber === 3) {
      const phase1 = db.getPhaseByNumber(projectId, 1);
      const phase2 = db.getPhaseByNumber(projectId, 2);
      input = {
        analysis: phase1 ? JSON.parse(phase1.output_data) : {},
        artDirection: phase2 ? JSON.parse(phase2.output_data) : {},
      };
    }

    // 创建或更新阶段记录
    let phase = db.getPhaseByNumber(projectId, phaseNumber);
    if (!phase) {
      phase = db.createPhase(projectId, phaseNumber, config.name, input);
    }
    db.updatePhaseReview(phase.id, 'pending', '');
    db.updatePhaseDecision(phase.id, 'pending', '');
    phase = db.getPhase(phase.id) || phase;

    emitEvent(projectId, { type: 'phase_progress', message: '正在执行...' });

    // 执行阶段
    const output = await config.execute(projectId, input);

    // 保存输出
    db.updatePhaseOutput(phase.id, output);

    emitEvent(projectId, { type: 'phase_progress', message: '执行完成，等待审核...' });

    // 业务审核
    emitEvent(projectId, { type: 'phase_progress', message: '正在进行业务审核...' });
    const businessReview = await config.review(output);
    const businessStatus = businessReview.审核结果 === 'PASS' ? 'business_pass' : 'business_fail';
    const businessSection = buildReviewSection(businessReview, ['问题列表', '建议列表']);
    db.updatePhaseReview(phase.id, businessStatus, upsertReviewPayload(phase.review_comments, 'business', businessSection));

    emitEvent(projectId, {
      type: 'phase_review',
      phase: phaseNumber,
      phaseId: phase.id,
      reviewStage: 'business',
      reviewResult: businessSection.result,
      status: businessStatus,
      comments: businessSection.summary || (businessSection.result === 'PASS' ? '业务审核通过' : '业务审核未通过'),
    });

    if (businessReview.审核结果 === 'FAIL') {
      db.updateProjectStatus(projectId, 'failed');
      emitEvent(projectId, { type: 'error', message: '业务审核未通过' });
      return;
    }

    // 合规审核
    emitEvent(projectId, { type: 'phase_progress', message: '正在进行合规审核...' });
    const complianceResultStr = await runAgent(
      `请审核以下内容是否符合合规要求：

${JSON.stringify(output, null, 2)}`,
      'complianceReviewSkill'
    );

    try {
      const complianceResult = parseReviewResponse(complianceResultStr);
      const complianceStatus = complianceResult.审核结果 === 'PASS' ? 'compliance_pass' : 'compliance_fail';
      const latestPhase = db.getPhase(phase.id);
      const complianceSection = buildReviewSection(complianceResult, ['违规列表', '问题列表', '建议列表']);
      db.updatePhaseReview(
        phase.id,
        complianceStatus,
        upsertReviewPayload(latestPhase?.review_comments, 'compliance', complianceSection)
      );

      emitEvent(projectId, {
        type: 'phase_review',
        phase: phaseNumber,
        phaseId: phase.id,
        reviewStage: 'compliance',
        reviewResult: complianceSection.result,
        status: complianceStatus,
        comments: complianceSection.summary || (complianceSection.result === 'PASS' ? '合规审核通过' : '合规审核未通过'),
      });

      if (complianceResult.审核结果 === 'FAIL') {
        db.updateProjectStatus(projectId, 'failed');
        emitEvent(projectId, { type: 'error', message: '合规审核未通过' });
        return;
      }
    } catch (e) {
      console.error('Compliance review parse error:', e);
      db.updatePhaseReview(phase.id, 'compliance_pass', complianceResultStr);
    }

    // 如果是分镜阶段，解析并保存分镜数据
    if (phaseNumber === 3) {
      // 保存场景
      if (output.场景清单) {
        db.clearScenesByProject(projectId);
        output.场景清单.forEach((scene: any, index: number) => {
          db.createScene(projectId, index + 1, {
            description: scene.场景名称 || '',
            location: scene.地点 || '',
            time_of_day: scene.时间 || '',
            characters: JSON.stringify(scene.涉及人物 || []),
          });
        });
      }

      // 保存角色
      if (output.人物清单) {
        db.clearCharactersByProject(projectId);
        output.人物清单.forEach((char: any) => {
          db.createCharacter(projectId, {
            name: char.姓名 || '',
            description: char.人物特点 || '',
            appearance: char.外貌特征 || '',
            personality: char.性格特点 || '',
          });
        });
      }

      // 保存分镜
      if (output.分镜列表 || output.shots) {
        const shots = output.分镜列表 || output.shots || [];
        db.clearShotsByProject(projectId);
        shots.forEach((shot: any, index: number) => {
          db.createShot(projectId, index + 1, {
            description: shot.分镜描述 || shot.description || '',
            camera_angle: shot.镜头角度 || shot.cameraAngle || '',
            camera_movement: shot.镜头运动 || shot.cameraMovement || '',
            duration: shot.时长 || shot.duration || 3,
            seedance_prompt: shot.seedance提示词 || shot.seedancePrompt || '',
          });
        });
      }
    }

    // 完成
    db.updateProjectStatus(projectId, 'completed');
    emitEvent(projectId, { type: 'phase_complete', phaseId: phase.id, data: output });
  } catch (error) {
    console.error('Error running phase:', error);
    db.updateProjectStatus(projectId, 'failed');
    emitEvent(projectId, { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
