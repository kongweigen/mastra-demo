import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { workspace } from './mastra.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDir, '..', '..', 'workspace');
const skillsRoot = resolve(workspaceRoot, 'skills');
const studioRoot = resolve(workspaceRoot, 'studio');
const agentsFile = resolve(studioRoot, 'agents.json');

export type ManagedSkill = {
  name: string;
  description: string;
  instructions: string;
  path: string;
};

export type ManagedAgent = {
  id: string;
  key: string;
  name: string;
  description: string;
  instructions: string;
  phaseNumber: 1 | 2 | 3 | null;
  skillNames: string[];
  updatedAt: string;
};

const DEFAULT_AGENTS: ManagedAgent[] = [
  {
    id: randomUUID(),
    key: 'script-analysis-agent',
    name: '剧本分析 Agent',
    description: '负责阶段一剧本分析和审核。',
    instructions:
      '你是剧本分析 Agent。你的职责是基于挂载的 skills 完成剧本分析、业务审核和合规审核。输出必须严格遵循技能说明，使用中文，优先返回结构化内容。',
    phaseNumber: 1,
    skillNames: ['director', 'script-analysis-review', 'compliance-review'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    key: 'art-direction-agent',
    name: '服化道 Agent',
    description: '负责阶段二服化道设计和审核。',
    instructions:
      '你是服化道 Agent。你的职责是基于挂载的 skills 完成人物、场景设计，以及业务审核和合规审核。输出必须严格遵循技能说明，使用中文，优先返回结构化内容。',
    phaseNumber: 2,
    skillNames: ['art-design', 'art-direction-review', 'compliance-review'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    key: 'storyboard-agent',
    name: '分镜师 Agent',
    description: '负责阶段三分镜生成和审核。',
    instructions:
      '你是分镜师 Agent。你的职责是基于挂载的 skills 完成 Seedance 分镜生成、业务审核和合规审核。输出必须严格遵循技能说明，使用中文，优先返回结构化内容。',
    phaseNumber: 3,
    skillNames: ['seedance-storyboard', 'seedance-prompt-review', 'compliance-review'],
    updatedAt: new Date().toISOString(),
  },
];

function normalizeSkillName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('SKILL.md is missing frontmatter');
  }

  const metadata: Record<string, string> = {};
  match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const index = line.indexOf(':');
      if (index === -1) {
        return;
      }

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      metadata[key] = value;
    });

  return {
    metadata,
    instructions: match[2].trim(),
  };
}

function serializeSkillFile(skill: Omit<ManagedSkill, 'path'>) {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.instructions.trim()}\n`;
}

async function ensureStudioFiles() {
  await mkdir(skillsRoot, { recursive: true });
  await mkdir(studioRoot, { recursive: true });

  try {
    await readFile(agentsFile, 'utf8');
  } catch {
    await writeFile(agentsFile, JSON.stringify(DEFAULT_AGENTS, null, 2), 'utf8');
  }
}

async function refreshWorkspaceSkills() {
  await workspace.skills?.refresh();
}

export async function listManagedSkills(): Promise<ManagedSkill[]> {
  await ensureStudioFiles();
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skills = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const path = resolve(skillsRoot, entry.name, 'SKILL.md');
        const raw = await readFile(path, 'utf8');
        const { metadata, instructions } = parseFrontmatter(raw);

        return {
          name: metadata.name || entry.name,
          description: metadata.description || '',
          instructions,
          path,
        } satisfies ManagedSkill;
      })
  );

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getManagedSkill(name: string) {
  const skillName = normalizeSkillName(name);
  const skills = await listManagedSkills();
  return skills.find((skill) => skill.name === skillName) || null;
}

export async function createManagedSkill(input: { name: string; description: string; instructions: string }) {
  await ensureStudioFiles();
  const name = normalizeSkillName(input.name);
  if (!name) {
    throw new Error('Skill name is required');
  }

  const existing = await getManagedSkill(name);
  if (existing) {
    throw new Error(`Skill "${name}" already exists`);
  }

  const dir = resolve(skillsRoot, name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, 'SKILL.md'),
    serializeSkillFile({
      name,
      description: input.description.trim(),
      instructions: input.instructions.trim(),
    }),
    'utf8'
  );
  await refreshWorkspaceSkills();
  return getManagedSkill(name);
}

export async function updateManagedSkill(
  name: string,
  input: Partial<{ description: string; instructions: string }>
) {
  const existing = await getManagedSkill(name);
  if (!existing) {
    throw new Error(`Skill "${name}" not found`);
  }

  await writeFile(
    existing.path,
    serializeSkillFile({
      name: existing.name,
      description: input.description?.trim() ?? existing.description,
      instructions: input.instructions?.trim() ?? existing.instructions,
    }),
    'utf8'
  );
  await refreshWorkspaceSkills();
  return getManagedSkill(existing.name);
}

export async function listManagedAgents(): Promise<ManagedAgent[]> {
  await ensureStudioFiles();
  const raw = await readFile(agentsFile, 'utf8');
  const agents = JSON.parse(raw) as ManagedAgent[];
  return agents.sort((a, b) => (a.phaseNumber || 99) - (b.phaseNumber || 99) || a.name.localeCompare(b.name));
}

async function saveManagedAgents(agents: ManagedAgent[]) {
  await ensureStudioFiles();
  await writeFile(agentsFile, JSON.stringify(agents, null, 2), 'utf8');
}

export async function getManagedAgent(id: string) {
  const agents = await listManagedAgents();
  return agents.find((agent) => agent.id === id) || null;
}

function validatePhaseUniqueness(agents: ManagedAgent[], currentId: string | null, phaseNumber: 1 | 2 | 3 | null) {
  if (!phaseNumber) {
    return;
  }

  const conflict = agents.find((agent) => agent.phaseNumber === phaseNumber && agent.id !== currentId);
  if (conflict) {
    throw new Error(`Phase ${phaseNumber} is already assigned to agent "${conflict.name}"`);
  }
}

export async function createManagedAgent(
  input: Omit<ManagedAgent, 'id' | 'updatedAt'> & { key?: string }
) {
  const agents = await listManagedAgents();
  validatePhaseUniqueness(agents, null, input.phaseNumber);

  const agent: ManagedAgent = {
    id: randomUUID(),
    key: normalizeSkillName(input.key || input.name),
    name: input.name.trim(),
    description: input.description.trim(),
    instructions: input.instructions.trim(),
    phaseNumber: input.phaseNumber,
    skillNames: [...new Set(input.skillNames.map(normalizeSkillName))],
    updatedAt: new Date().toISOString(),
  };

  agents.push(agent);
  await saveManagedAgents(agents);
  return agent;
}

export async function updateManagedAgent(
  id: string,
  input: Partial<Omit<ManagedAgent, 'id' | 'updatedAt'>>
) {
  const agents = await listManagedAgents();
  const index = agents.findIndex((agent) => agent.id === id);
  if (index === -1) {
    throw new Error(`Agent "${id}" not found`);
  }

  const current = agents[index];
  const nextPhaseNumber = input.phaseNumber === undefined ? current.phaseNumber : input.phaseNumber;
  validatePhaseUniqueness(agents, current.id, nextPhaseNumber);

  const next: ManagedAgent = {
    ...current,
    key: input.key ? normalizeSkillName(input.key) : current.key,
    name: input.name?.trim() ?? current.name,
    description: input.description?.trim() ?? current.description,
    instructions: input.instructions?.trim() ?? current.instructions,
    phaseNumber: nextPhaseNumber,
    skillNames: input.skillNames ? [...new Set(input.skillNames.map(normalizeSkillName))] : current.skillNames,
    updatedAt: new Date().toISOString(),
  };

  agents[index] = next;
  await saveManagedAgents(agents);
  return next;
}

export async function getPhaseAgent(phaseNumber: 1 | 2 | 3) {
  const agents = await listManagedAgents();
  return agents.find((agent) => agent.phaseNumber === phaseNumber) || null;
}

// ============================================
// 阶段输出 JSON Schema 定义 (英文 Key)
// ============================================

export type MaterialStatus = 'new' | 'reuse' | 'variant';

export interface Phase1PlotPoint {
  episode: number;
  plotPoint: string;
  coreConflict: string;
  emotionalArc: string;
  directorNotes: string;
  estimatedDuration: number;
}

export interface Phase1Character {
  name: string;
  age: string;
  appearance: string;
  status: MaterialStatus;
}

export interface Phase1Scene {
  name: string;
  timeOfDay: string;
  lightingTone: string;
  atmosphere: string;
  status: MaterialStatus;
}

export interface Phase1Output {
  plotBreakdown: Phase1PlotPoint[];
  characters: Phase1Character[];
  scenes: Phase1Scene[];
}

export interface Phase2CharacterStyle {
  name: string;
  prompt: string;
}

export interface Phase2SceneEnvironment {
  name: string;
  prompt: string;
}

export interface Phase2Output {
  characterStyles: Phase2CharacterStyle[];
  sceneEnvironments: Phase2SceneEnvironment[];
}

export interface Phase3Asset {
  assetId: string;
  type: 'character' | 'scene';
  name: string;
}

export interface Phase3Shot {
  shotNumber: number;
  scene: string;
  characters: string;
  cameraAngle: string;
  cameraMovement: string;
  actionDescription: string;
  duration: number;
  seedancePrompt: string;
}

export interface Phase3Output {
  assetMapping: Phase3Asset[];
  shots: Phase3Shot[];
}
