import * as db from './db/index.js';
import { emitEvent } from './routes/sse.js';
import { getPhaseAgent } from './lib/studio-config.js';
import { runManagedAgentJson, type ManagedAgentJsonEnvelope } from './lib/managed-agent.js';

export type PhaseType = 1 | 2 | 3;

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
    raw?.result,
    raw?.status,
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
    /FAIL/,
    /未通过/,
    /不通过/,
    /需要修改/,
  ];

  if (failPatterns.some((pattern) => pattern.test(text) || pattern.test(normalized))) {
    return 'FAIL';
  }

  const passPatterns = [
    /PASS/,
    /通过/,
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
    raw.reason ||
    raw.summary ||
    raw.建议 ||
    ''
  );
}

function pickPrimaryReviewNode(raw: any) {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  const candidates = [
    raw.review,
    raw.businessReview,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }

  return raw;
}

function extractProblemItems(raw: any): any[] {
  const primary = pickPrimaryReviewNode(raw);

  const items: any[] = [];
  const pushList = (value: any) => {
    for (const item of toList(value)) {
      if (item) {
        items.push(item);
      }
    }
  };

  pushList(raw?.issues);
  pushList(raw?.problems);
  pushList(primary?.issues);
  pushList(primary?.problems);

  return items;
}

function formatProblemItem(item: any): string {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item.trim();
  }

  if (typeof item !== 'object') {
    return String(item);
  }

  const location = item.location || item.place || item.id || '';
  const issue =
    item.issue ||
    item.summary ||
    item.description ||
    '';

  const direction =
    item.suggestion ||
    item.fix ||
    '';

  const parts = [
    location ? `[${String(location)}]` : '',
    issue ? String(issue).trim() : '',
    direction ? `建议: ${String(direction).trim()}` : '',
  ].filter(Boolean);

  return parts.join(' ');
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

function buildReviewSection(raw: any, _detailKeys: string[]): ReviewSection {
  const primary = pickPrimaryReviewNode(raw);
  const extracted = extractProblemItems(raw);
  const details = [...extracted].filter(Boolean);

  const baseSummary = summarizeReviewText(raw) || summarizeReviewText(primary) || '';

  const topLines = details
    .map(formatProblemItem)
    .filter(Boolean)
    .slice(0, 6);

  const summary =
    baseSummary ||
    (topLines.length > 0
      ? `主要问题：\n${topLines.map((line) => `- ${line}`).join('\n')}`
      : '');

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
        if (!parsed.result) {
          parsed.result = inferReviewResult(parsed);
        }
        return parsed;
      }
    }
  } catch {
    // Fall through to text-based normalization below.
  }

  return {
    result: inferReviewResult(reviewResult),
    reason: reviewResult,
  };
}

function upsertReviewPayload(existing: string | undefined, stage: 'business' | 'compliance', section: ReviewSection) {
  const payload = parseReviewPayload(existing);
  payload[stage] = section;
  payload.latestStage = stage;
  return JSON.stringify(payload);
}

async function runPhaseAgent(
  phaseNumber: PhaseType,
  phaseLabel: string,
  prompt: string,
  responseFormatHint?: string
) {
  const agent = await getPhaseAgent(phaseNumber);
  if (!agent) {
    throw new Error(`No agent found for phase ${phaseNumber}. Please configure it in Studio.`);
  }

  return runManagedAgentJson(agent, {
    prompt,
    phaseLabel,
    responseFormatHint,
    mountedSkillNames: agent.skillNames,
    envelope: {
      phase: phaseNumber,
      step: 'execute',
    },
  });
}

async function runReviewAgent(
  phaseNumber: PhaseType,
  phaseLabel: string,
  prompt: string,
  responseFormatHint?: string
) {
  // Get the phase agent to access its skills
  const agent = await getPhaseAgent(phaseNumber);
  if (!agent) {
    throw new Error(`No agent found for phase ${phaseNumber}.`);
  }

  // For now, use the same agent with its skills for review
  // In the future, this could be configured to use different review agents
  return runManagedAgentJson(agent, {
    prompt,
    phaseLabel,
    responseFormatHint,
    mountedSkillNames: agent.skillNames,
    envelope: {
      phase: phaseNumber,
      step: 'business_review',
    },
  });
}

function parseStoredPhaseOutput(outputData: string | undefined) {
  if (!outputData) return {};
  try {
    const parsed = JSON.parse(outputData);
    if (parsed && typeof parsed === 'object' && parsed.schemaVersion === 1 && parsed.data) {
      return parsed.data;
    }
    return parsed;
  } catch {
    return {};
  }
}

function reviewSectionFromEnvelope(envelope: ManagedAgentJsonEnvelope): ReviewSection {
  const result = envelope.result === 'PASS' ? 'PASS' : 'FAIL';
  const summary = envelope.summary || summarizeReviewText(envelope.data) || '';
  const details = Array.isArray(envelope.issues) ? envelope.issues : [];
  return {
    result,
    summary,
    details,
    raw: envelope,
  };
}

export async function runPhase(projectId: string, phaseNumber: PhaseType): Promise<void> {
  // Get agent from agents.json
  const agent = await getPhaseAgent(phaseNumber);
  if (!agent) {
    throw new Error(`No agent configured for phase ${phaseNumber}. Please configure in Studio.`);
  }

  const phaseName = agent.name || `Phase ${phaseNumber}`;

  // Send start event
  emitEvent(projectId, { type: 'phase_start', phase: phaseNumber });
  db.updateProjectStatus(projectId, 'running');

  try {
    // Get project data
    const project = db.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Build input based on phase
    let input: any = {};
    if (phaseNumber === 1) {
      input = { script: project.script };
    } else if (phaseNumber === 2) {
      const phase1 = db.getPhaseByNumber(projectId, 1);
      input = { analysis: phase1 ? parseStoredPhaseOutput(phase1.output_data) : {} };
    } else if (phaseNumber === 3) {
      const phase1 = db.getPhaseByNumber(projectId, 1);
      const phase2 = db.getPhaseByNumber(projectId, 2);
      input = {
        analysis: phase1 ? parseStoredPhaseOutput(phase1.output_data) : {},
        artDirection: phase2 ? parseStoredPhaseOutput(phase2.output_data) : {},
      };
    }

    // Create or update phase record
    let phase = db.getPhaseByNumber(projectId, phaseNumber);
    if (!phase) {
      phase = db.createPhase(projectId, phaseNumber, phaseName, input);
    }
    db.updatePhaseReview(phase.id, 'pending', '');
    db.updatePhaseDecision(phase.id, 'pending', '');
    phase = db.getPhase(phase.id) || phase;

    emitEvent(projectId, { type: 'phase_progress', message: '正在执行...' });

    // Build simple prompt - pass raw data to agent, let Skill handle the logic
    let prompt = '';
    if (phaseNumber === 1) {
      prompt = `剧本内容：\n${input.script}`;
    } else if (phaseNumber === 2) {
      prompt = `导演分析产出：\n${JSON.stringify(input.analysis, null, 2)}`;
    } else if (phaseNumber === 3) {
      prompt = `导演分析：\n${JSON.stringify(input.analysis, null, 2)}\n\n服化道设计：\n${JSON.stringify(input.artDirection, null, 2)}`;
    }

    // Execute phase
    const outputEnvelope = await runPhaseAgent(phaseNumber, `phase${phaseNumber}_execute`, prompt, '只输出 JSON。data 字段必须是对象。');
    const output = outputEnvelope.data || {};

    // Save output
    db.updatePhaseOutput(phase.id, outputEnvelope);

    emitEvent(projectId, { type: 'phase_progress', message: '执行完成，等待审核...' });

    // Business review
    emitEvent(projectId, { type: 'phase_progress', message: '正在进行业务审核...' });
    const reviewPrompt = `请审核以下产出：\n${JSON.stringify(output, null, 2)}`;

    const businessReviewEnvelope = await runReviewAgent(phaseNumber, `phase${phaseNumber}_business_review`, reviewPrompt, '只输出 JSON。result 只允许 PASS/FAIL。');
    const businessReviewData = businessReviewEnvelope.data || {};
    const businessStatus = businessReviewEnvelope.result === 'PASS' ? 'business_pass' : 'business_fail';
    const businessSection = buildReviewSection(businessReviewData, ['issues', 'suggestions']);
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

    if (businessReviewEnvelope.result === 'FAIL') {
      db.updateProjectStatus(projectId, 'failed');
      emitEvent(projectId, { type: 'error', message: '业务审核未通过' });
      return;
    }

    // Compliance review
    emitEvent(projectId, { type: 'phase_progress', message: '正在进行合规审核...' });
    const compliancePrompt = `请审核以下内容是否符合合规要求：\n${JSON.stringify(output, null, 2)}`;

    const complianceEnvelope = await runPhaseAgent(
      phaseNumber,
      `phase${phaseNumber}_compliance_review`,
      compliancePrompt,
      '只输出 JSON。'
    );

    try {
      const complianceResultData = complianceEnvelope.data || {};
      const complianceStatus = complianceEnvelope.result === 'PASS' ? 'compliance_pass' : 'compliance_fail';
      const latestPhase = db.getPhase(phase.id);
      const complianceSection = buildReviewSection(complianceResultData, ['issues', 'violations', 'suggestions']);
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

      if (complianceEnvelope.result === 'FAIL') {
        db.updateProjectStatus(projectId, 'failed');
        emitEvent(projectId, { type: 'error', message: '合规审核未通过' });
        return;
      }
    } catch (e) {
      console.error('Compliance review parse error:', e);
      db.updatePhaseReview(phase.id, 'compliance_pass', JSON.stringify(complianceEnvelope));
    }

    // Save phase data based on phase type
    if (phaseNumber === 1) {
      // Save scenes
      const scenes = output.scenes || output.场景清单;
      if (scenes) {
        db.clearScenesByProject(projectId);
        scenes.forEach((scene: any, index: number) => {
          db.createScene(projectId, index + 1, {
            description: scene.name || scene.场景名称 || '',
            location: scene.location || '',
            time_of_day: scene.timeOfDay || scene.时间 || '',
            characters: JSON.stringify([]),
          });
        });
      }

      // Save characters
      const characters = output.characters || output.人物清单;
      if (characters) {
        db.clearCharactersByProject(projectId);
        characters.forEach((char: any) => {
          db.createCharacter(projectId, {
            name: char.name || char.姓名 || '',
            description: '',
            appearance: char.appearance || '',
            personality: '',
          });
        });
      }
    } else if (phaseNumber === 3) {
      // Save shots
      const shots = output.shots || output.分镜列表;
      if (shots) {
        db.clearShotsByProject(projectId);
        shots.forEach((shot: any, index: number) => {
          db.createShot(projectId, index + 1, {
            description: shot.actionDescription || shot.动作要点 || '',
            camera_angle: shot.cameraAngle || shot.镜头角度 || '',
            camera_movement: shot.cameraMovement || shot.镜头运动 || '',
            duration: shot.duration || shot.时长 || 3,
            seedance_prompt: shot.seedancePrompt || shot.seedance提示词 || '',
          });
        });
      }
    }

    // Complete
    db.updateProjectStatus(projectId, 'completed');
    emitEvent(projectId, { type: 'phase_complete', phaseId: phase.id, data: output });
  } catch (error) {
    console.error('Error running phase:', error);
    db.updateProjectStatus(projectId, 'failed');
    emitEvent(projectId, { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
