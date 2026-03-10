<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { studioApi } from '@/api';
import type { ManagedAgent, ManagedSkill } from '@/types';

const router = useRouter();

const loading = ref(true);
const errorMessage = ref('');
const saving = ref(false);

const agents = ref<ManagedAgent[]>([]);
const skills = ref<ManagedSkill[]>([]);

const selectedAgentId = ref<string>('');
const selectedSkillName = ref<string>('');

const agentDraft = ref<Partial<ManagedAgent> | null>(null);
const skillDraft = ref<Partial<ManagedSkill> | null>(null);

const isCreatingAgent = ref(false);
const isCreatingSkill = ref(false);

const phaseOptions = [
  { label: '不绑定阶段(自定义)', value: null as null },
  { label: '阶段 1: 剧本分析', value: 1 as const },
  { label: '阶段 2: 服化道', value: 2 as const },
  { label: '阶段 3: 分镜师', value: 3 as const },
];

const sortedAgents = computed(() => {
  return [...agents.value].sort(
    (a, b) => (a.phaseNumber || 99) - (b.phaseNumber || 99) || a.name.localeCompare(b.name)
  );
});

const sortedSkills = computed(() => {
  return [...skills.value].sort((a, b) => a.name.localeCompare(b.name));
});

const selectedAgent = computed(() => {
  return agents.value.find((a) => a.id === selectedAgentId.value) || null;
});

const selectedSkill = computed(() => {
  return skills.value.find((s) => s.name === selectedSkillName.value) || null;
});

function resetDrafts() {
  agentDraft.value = null;
  skillDraft.value = null;
  isCreatingAgent.value = false;
  isCreatingSkill.value = false;
  errorMessage.value = '';
}

async function reload() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await studioApi.bootstrap();
    agents.value = data.agents;
    skills.value = data.skills;

    if (!selectedAgentId.value && agents.value.length > 0) {
      selectedAgentId.value = agents.value[0].id;
    }
    if (!selectedSkillName.value && skills.value.length > 0) {
      selectedSkillName.value = skills.value[0].name;
    }
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.error || e?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

function openAgent(agentId: string) {
  resetDrafts();
  selectedAgentId.value = agentId;
  const agent = agents.value.find((a) => a.id === agentId);
  agentDraft.value = agent ? JSON.parse(JSON.stringify(agent)) : null;
}

function openSkill(skillName: string) {
  resetDrafts();
  selectedSkillName.value = skillName;
  const skill = skills.value.find((s) => s.name === skillName);
  skillDraft.value = skill ? JSON.parse(JSON.stringify(skill)) : null;
}

function startCreateAgent() {
  resetDrafts();
  isCreatingAgent.value = true;
  agentDraft.value = {
    key: '',
    name: '',
    description: '',
    instructions: '',
    phaseNumber: null,
    skillNames: [],
  };
}

function startCreateSkill() {
  resetDrafts();
  isCreatingSkill.value = true;
  skillDraft.value = {
    name: '',
    description: '',
    instructions: '',
  };
}

function toggleAgentSkill(name: string) {
  if (!agentDraft.value) return;
  const current = Array.isArray(agentDraft.value.skillNames) ? agentDraft.value.skillNames : [];
  const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
  agentDraft.value = { ...agentDraft.value, skillNames: next };
}

async function saveAgent() {
  if (!agentDraft.value) return;
  saving.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      key: String(agentDraft.value.key || '').trim(),
      name: String(agentDraft.value.name || '').trim(),
      description: String(agentDraft.value.description || '').trim(),
      instructions: String(agentDraft.value.instructions || '').trim(),
      phaseNumber: (agentDraft.value.phaseNumber ?? null) as 1 | 2 | 3 | null,
      skillNames: Array.isArray(agentDraft.value.skillNames) ? agentDraft.value.skillNames : [],
    };

    if (!payload.name) {
      throw new Error('Agent 名称不能为空');
    }

    if (isCreatingAgent.value) {
      const created = await studioApi.createAgent(payload as any);
      await reload();
      selectedAgentId.value = created.id;
      openAgent(created.id);
    } else if (selectedAgent.value) {
      await studioApi.updateAgent(selectedAgent.value.id, payload as any);
      await reload();
      openAgent(selectedAgent.value.id);
    }
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.error || e?.message || '保存失败';
  } finally {
    saving.value = false;
  }
}

async function saveSkill() {
  if (!skillDraft.value) return;
  saving.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      name: String(skillDraft.value.name || '').trim(),
      description: String(skillDraft.value.description || '').trim(),
      instructions: String(skillDraft.value.instructions || '').trim(),
    };

    if (!payload.name) {
      throw new Error('Skill 名称不能为空');
    }

    if (isCreatingSkill.value) {
      const created = await studioApi.createSkill(payload);
      await reload();
      selectedSkillName.value = created.name;
      openSkill(created.name);
    } else if (selectedSkill.value) {
      await studioApi.updateSkill(selectedSkill.value.name, {
        description: payload.description,
        instructions: payload.instructions,
      });
      await reload();
      openSkill(selectedSkill.value.name);
    }
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.error || e?.message || '保存失败';
  } finally {
    saving.value = false;
  }
}

function goBack() {
  router.push('/');
}

onMounted(async () => {
  await reload();
  if (selectedAgent.value) {
    openAgent(selectedAgent.value.id);
  }
  if (selectedSkill.value) {
    openSkill(selectedSkill.value.name);
  }
});
</script>

<template>
  <div class="studio">
    <header class="studio-header">
      <div class="header-left">
        <button class="btn-back" @click="goBack">← 返回</button>
        <div class="title">
          <h1>Studio</h1>
          <p>管理 Agents 和 Skills，阶段执行会按 phase 绑定的 agent 运行</p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="layout">
      <div v-if="errorMessage" class="banner banner-error">{{ errorMessage }}</div>

      <section class="panel">
        <div class="panel-head">
          <h2>Agents</h2>
          <div class="panel-actions">
            <button class="btn btn-secondary" @click="reload" :disabled="saving">刷新</button>
            <button class="btn btn-primary" @click="startCreateAgent" :disabled="saving">新增 Agent</button>
          </div>
        </div>

        <div class="panel-body split">
          <div class="list">
            <button
              v-for="agent in sortedAgents"
              :key="agent.id"
              class="list-item"
              :class="{ active: agent.id === selectedAgentId }"
              @click="openAgent(agent.id)"
            >
              <div class="list-title">{{ agent.name }}</div>
              <div class="list-meta">
                <span class="pill">{{ agent.key }}</span>
                <span class="pill pill-phase">{{ agent.phaseNumber ? `phase ${agent.phaseNumber}` : 'custom' }}</span>
              </div>
            </button>
          </div>

          <div class="editor" v-if="agentDraft">
            <div class="editor-row">
              <label>Key</label>
              <input v-model="agentDraft.key" type="text" placeholder="script-analysis-agent" />
            </div>
            <div class="editor-row">
              <label>名称</label>
              <input v-model="agentDraft.name" type="text" placeholder="剧本分析 Agent" />
            </div>
            <div class="editor-row">
              <label>描述</label>
              <input v-model="agentDraft.description" type="text" placeholder="负责阶段一剧本分析和审核" />
            </div>
            <div class="editor-row">
              <label>绑定阶段</label>
              <select v-model="agentDraft.phaseNumber">
                <option v-for="opt in phaseOptions" :key="String(opt.value)" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="editor-row">
              <label>系统指令</label>
              <textarea v-model="agentDraft.instructions" rows="8" placeholder="Agent 的系统指令"></textarea>
            </div>

            <div class="editor-row">
              <label>挂载 Skills</label>
              <div class="skills-grid">
                <label v-for="skill in sortedSkills" :key="skill.name" class="skill-check">
                  <input
                    type="checkbox"
                    :checked="(agentDraft.skillNames || []).includes(skill.name)"
                    @change="toggleAgentSkill(skill.name)"
                  />
                  <span class="skill-text">
                    <span class="skill-name">{{ skill.name }}</span>
                    <span class="skill-desc">{{ skill.description }}</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="editor-actions">
              <button class="btn btn-primary" @click="saveAgent" :disabled="saving">
                {{ saving ? '保存中...' : isCreatingAgent ? '创建 Agent' : '保存 Agent' }}
              </button>
            </div>
          </div>
          <div class="editor empty" v-else>选择一个 Agent 或新增</div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Skills</h2>
          <div class="panel-actions">
            <button class="btn btn-secondary" @click="reload" :disabled="saving">刷新</button>
            <button class="btn btn-primary" @click="startCreateSkill" :disabled="saving">新增 Skill</button>
          </div>
        </div>

        <div class="panel-body split">
          <div class="list">
            <button
              v-for="skill in sortedSkills"
              :key="skill.name"
              class="list-item"
              :class="{ active: skill.name === selectedSkillName }"
              @click="openSkill(skill.name)"
            >
              <div class="list-title">{{ skill.name }}</div>
              <div class="list-meta">
                <span class="pill">{{ skill.description || 'no description' }}</span>
              </div>
            </button>
          </div>

          <div class="editor" v-if="skillDraft">
            <div class="editor-row">
              <label>名称</label>
              <input v-model="skillDraft.name" type="text" placeholder="director" :disabled="!isCreatingSkill" />
            </div>
            <div class="editor-row">
              <label>描述</label>
              <input v-model="skillDraft.description" type="text" placeholder="技能描述" />
            </div>
            <div class="editor-row">
              <label>指令内容</label>
              <textarea v-model="skillDraft.instructions" rows="12" placeholder="SKILL.md 内容(不含 frontmatter)"></textarea>
            </div>
            <div class="editor-actions">
              <button class="btn btn-primary" @click="saveSkill" :disabled="saving">
                {{ saving ? '保存中...' : isCreatingSkill ? '创建 Skill' : '保存 Skill' }}
              </button>
            </div>
          </div>
          <div class="editor empty" v-else>选择一个 Skill 或新增</div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.studio {
  min-height: 100vh;
  background:
    radial-gradient(1200px 400px at 15% 0%, rgba(16, 185, 129, 0.14), transparent 55%),
    radial-gradient(1000px 420px at 80% 10%, rgba(37, 99, 235, 0.12), transparent 55%),
    linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.studio-header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.45);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.btn-back {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.6);
  color: #0f172a;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}

.title h1 {
  font-size: 18px;
  letter-spacing: 0.4px;
  color: #0f172a;
}

.title p {
  font-size: 12px;
  color: #475569;
}

.layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 24px 32px;
  display: grid;
  gap: 18px;
}

.banner {
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
}

.banner-error {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #991b1b;
}

.panel {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 30px rgba(15, 23, 42, 0.06);
}

.panel-head {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
}

.panel-head h2 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #0f172a;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-body {
  padding: 14px 16px 18px;
}

.split {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 14px;
}

.list {
  display: grid;
  gap: 10px;
  align-content: start;
}

.list-item {
  text-align: left;
  background: rgba(248, 250, 252, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}

.list-item:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.45);
}

.list-item.active {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.55);
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8px;
}

.list-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #334155;
}

.pill-phase {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.22);
}

.editor {
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: 16px;
  padding: 14px 14px 16px;
  background: rgba(255, 255, 255, 0.6);
}

.editor.empty {
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 13px;
}

.editor-row {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
}

.editor-row label {
  font-size: 12px;
  color: #334155;
}

.editor-row input,
.editor-row textarea,
.editor-row select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  outline: none;
}

.editor-row textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  line-height: 1.4;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.skill-check {
  display: grid;
  grid-template-columns: 18px 1fr;
  grid-template-rows: auto;
  gap: 8px;
  align-items: start;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.65);
}

.skill-check input {
  margin-top: 2px;
}

.skill-text {
  grid-column: 2;
  display: grid;
  gap: 2px;
  min-width: 0;
}

.skill-name {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.skill-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.25;
  max-height: 2.5em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: filter 0.12s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-secondary {
  background: #e2e8f0;
  color: #0f172a;
}

.btn:hover {
  filter: brightness(0.98);
}

.loading {
  padding: 28px 24px;
  color: #334155;
}

@media (max-width: 980px) {
  .split {
    grid-template-columns: 1fr;
  }
  .skills-grid {
    grid-template-columns: 1fr;
  }
}
</style>
