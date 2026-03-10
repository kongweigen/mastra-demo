<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '@/stores/project';

const route = useRoute();
const router = useRouter();
const store = useProjectStore();

const projectId = computed(() => route.params.id as string);
const activeTab = ref<'script' | 'output' | 'shots'>('script');
const editedScript = ref('');
const isSaving = ref(false);
const decisionLoadingByPhase = ref<Record<string, boolean>>({});
const reviewPanelExpandedByPhase = ref<Record<string, boolean>>({});
const resultExpandedByPhase = ref<Record<string, boolean>>({});
const reviewTextExpanded = ref<Record<string, boolean>>({});
const decisionNoteByPhase = ref<Record<string, string>>({});
const decisionFeedbackByPhase = ref<Record<string, string>>({});

onMounted(async () => {
  await store.fetchProject(projectId.value);
  if (store.currentProject) {
    editedScript.value = store.currentProject.script;
  }
  store.subscribeToSSE(projectId.value);
});

onUnmounted(() => {
  store.disconnectSSE();
});

watch(
  () => store.currentProject,
  (project) => {
    if (project) {
      editedScript.value = project.script;
    }
  }
);

async function saveScript() {
  isSaving.value = true;
  try {
    await store.updateProject(projectId.value, { script: editedScript.value });
  } finally {
    isSaving.value = false;
  }
}

async function runPhase(phase: number) {
  await store.runPhase(projectId.value, phase);
}

async function updatePhaseDecision(phaseId: string, decision: 'confirmed' | 'needs_optimization') {
  decisionLoadingByPhase.value[phaseId] = true;

  try {
    const note = decisionNoteByPhase.value[phaseId]?.trim();
    await store.updatePhaseDecision(
      phaseId,
      decision,
      note || (decision === 'confirmed' ? '用户确认当前审核结果' : '用户选择需要继续优化')
    );

    decisionFeedbackByPhase.value[phaseId] =
      decision === 'confirmed' ? '已确认当前审核结果，审核模块已收起。' : '已标记为需要优化，请根据反馈继续修改后重新执行。';

    if (decision === 'confirmed') {
      reviewPanelExpandedByPhase.value[phaseId] = false;
    } else {
      reviewPanelExpandedByPhase.value[phaseId] = true;
    }
  } finally {
    decisionLoadingByPhase.value[phaseId] = false;
  }
}

function goBack() {
  router.push('/');
}

function formatJSON(str: string) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function parseReviewComments(comments: string) {
  try {
    const parsed = JSON.parse(comments);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getReviewSection(phase: { review_comments: string }, stage: 'business' | 'compliance') {
  const parsed = parseReviewComments(phase.review_comments);
  const section = parsed[stage];
  return section && typeof section === 'object' ? section : null;
}

function formatAny(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getReviewSummary(section: any) {
  const summary = typeof section?.summary === 'string' ? section.summary.trim() : '';
  if (summary) return summary;

  const raw = section?.raw;
  if (raw) return formatAny(raw);

  return '暂无摘要';
}

function inferReviewResultFromText(value: unknown): 'PASS' | 'FAIL' | undefined {
  if (!value) {
    return undefined;
  }

  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const normalized = text.toUpperCase();

  if (
    /业务审核[:：]\s*FAIL/.test(text) ||
    /合规审核[:：]\s*FAIL/.test(text) ||
    /审核结果[:：]\s*FAIL/.test(text) ||
    /\bFAIL\b/.test(normalized) ||
    /未通过/.test(text) ||
    /不通过/.test(text) ||
    /需要修改/.test(text)
  ) {
    return 'FAIL';
  }

  if (
    /业务审核[:：]\s*PASS/.test(text) ||
    /合规审核[:：]\s*PASS/.test(text) ||
    /审核结果[:：]\s*PASS/.test(text) ||
    /\bPASS\b/.test(normalized) ||
    /通过/.test(text)
  ) {
    return 'PASS';
  }

  return undefined;
}

function getResolvedReviewResult(section: any): 'PASS' | 'FAIL' | undefined {
  return (
    inferReviewResultFromText(section?.raw) ||
    inferReviewResultFromText(section?.summary) ||
    inferReviewResultFromText(section?.result) ||
    (section?.result === 'PASS' || section?.result === 'FAIL' ? section.result : undefined)
  );
}

function getReviewResultText(result?: string) {
  return result === 'PASS' ? '通过' : result === 'FAIL' ? '未通过' : '待审核';
}

function getDecisionText(decision?: string) {
  const map: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认结果',
    needs_optimization: '需要优化',
  };
  return map[decision || 'pending'] || '待确认';
}

function getPhaseStatus(phaseNum: number) {
  const phase = store.currentProject?.phases?.find((p) => p.phase_number === phaseNum);
  return phase ? getEffectiveReviewStatus(phase) : 'pending';
}

function getPhaseDecision(phaseNum: number) {
  const phase = store.currentProject?.phases?.find((p) => p.phase_number === phaseNum);
  return phase?.review_decision || 'pending';
}

function getReviewStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '待审核',
    business_pass: '业务审核通过',
    business_fail: '业务审核未通过',
    compliance_pass: '合规审核通过',
    compliance_fail: '合规审核未通过',
  };
  return map[status] || status;
}

function getEffectiveReviewStatus(phase: { review_status: string; review_comments: string }) {
  const business = getResolvedReviewResult(getReviewSection(phase, 'business'));
  const compliance = getResolvedReviewResult(getReviewSection(phase, 'compliance'));

  if (compliance === 'FAIL') {
    return 'compliance_fail';
  }

  if (compliance === 'PASS') {
    return 'compliance_pass';
  }

  if (business === 'FAIL') {
    return 'business_fail';
  }

  if (business === 'PASS') {
    return 'business_pass';
  }

  return phase.review_status || 'pending';
}

function isReviewPanelExpanded(phaseId: string, decision?: string) {
  return reviewPanelExpandedByPhase.value[phaseId] ?? decision !== 'confirmed';
}

function toggleReviewPanel(phaseId: string) {
  reviewPanelExpandedByPhase.value[phaseId] = !isReviewPanelExpanded(phaseId);
}

function isResultExpanded(phaseId: string) {
  return resultExpandedByPhase.value[phaseId] ?? false;
}

function toggleResultExpanded(phaseId: string) {
  resultExpandedByPhase.value[phaseId] = !isResultExpanded(phaseId);
}

function getReviewTextKey(phaseId: string, stage: 'business' | 'compliance') {
  return `${phaseId}:${stage}`;
}

function isReviewTextExpanded(phaseId: string, stage: 'business' | 'compliance') {
  return reviewTextExpanded.value[getReviewTextKey(phaseId, stage)] ?? false;
}

function toggleReviewTextExpanded(phaseId: string, stage: 'business' | 'compliance') {
  const key = getReviewTextKey(phaseId, stage);
  reviewTextExpanded.value[key] = !isReviewTextExpanded(phaseId, stage);
}

function getDecisionFeedback(phaseId: string, serverNote?: string) {
  return decisionFeedbackByPhase.value[phaseId] || serverNote || '';
}

function parsePhaseOutput(outputData: string) {
  try {
    const parsed = JSON.parse(outputData);
    // Handle envelope format
    if (parsed.schemaVersion === 1 && parsed.data) {
      return parsed.data;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getPhase1Output(output: any) {
  return {
    plotBreakdown: output?.plotBreakdown || output?.剧情拆解 || [],
    characters: output?.characters || output?.人物清单 || [],
    scenes: output?.scenes || output?.场景清单 || [],
  };
}

function getPhase2Output(output: any) {
  return {
    characterStyles: output?.characterStyles || output?.人物造型 || [],
    sceneEnvironments: output?.sceneEnvironments || output?.场景环境 || [],
  };
}

function getPhase3Output(output: any) {
  return {
    assetMapping: output?.assetMapping || output?.素材对应表 || [],
    shots: output?.shots || output?.分镜列表 || [],
  };
}

function getFormattedOutput(phaseNumber: number, outputData: string) {
  const output = parsePhaseOutput(outputData);
  if (!output) return null;

  if (phaseNumber === 1) return getPhase1Output(output);
  if (phaseNumber === 2) return getPhase2Output(output);
  if (phaseNumber === 3) return getPhase3Output(output);
  return null;
}

</script>

<template>
  <div class="detail-container">
    <header class="detail-header">
      <div class="header-left">
        <button class="btn-back" @click="goBack">← 返回</button>
        <h1>{{ store.currentProject?.title || '加载中...' }}</h1>
      </div>
      <div class="header-right">
        <div class="header-status">
          <span
            class="status-badge"
            :class="`status-${store.currentProject?.status}`"
          >
            {{ store.currentProject?.status === 'running' ? '进行中' : store.currentProject?.status === 'completed' ? '已完成' : store.currentProject?.status === 'failed' ? '失败' : '待开始' }}
          </span>
        </div>
      </div>
    </header>

    <div class="content-layout">
      <!-- 左侧：流程控制 -->
      <aside class="phase-panel">
        <h3>执行流程</h3>
        <div class="phase-list">
          <div class="phase-item" :class="{ active: store.currentPhase === 1 }">
            <div class="phase-header">
              <span class="phase-number">1</span>
              <span class="phase-name">剧本分析</span>
            </div>
            <div class="phase-status">
              <span :class="`review-badge ${getPhaseStatus(1)}`">
                {{ getReviewStatusText(getPhaseStatus(1)) }}
              </span>
              <span class="decision-badge" :class="`decision-${getPhaseDecision(1)}`">
                {{ getDecisionText(getPhaseDecision(1)) }}
              </span>
            </div>
            <button
              class="btn-run"
              :disabled="store.isRunning || !store.currentProject?.script"
              @click="runPhase(1)"
            >
              {{ store.isRunning && store.currentPhase === 1 ? '执行中...' : '执行' }}
            </button>
          </div>

          <div class="phase-item" :class="{ active: store.currentPhase === 2 }">
            <div class="phase-header">
              <span class="phase-number">2</span>
              <span class="phase-name">服化道设计</span>
            </div>
            <div class="phase-status">
              <span :class="`review-badge ${getPhaseStatus(2)}`">
                {{ getReviewStatusText(getPhaseStatus(2)) }}
              </span>
              <span class="decision-badge" :class="`decision-${getPhaseDecision(2)}`">
                {{ getDecisionText(getPhaseDecision(2)) }}
              </span>
            </div>
            <button
              class="btn-run"
              :disabled="store.isRunning || getPhaseStatus(1) !== 'compliance_pass' || getPhaseDecision(1) !== 'confirmed'"
              @click="runPhase(2)"
            >
              {{ store.isRunning && store.currentPhase === 2 ? '执行中...' : '执行' }}
            </button>
          </div>

          <div class="phase-item" :class="{ active: store.currentPhase === 3 }">
            <div class="phase-header">
              <span class="phase-number">3</span>
              <span class="phase-name">分镜生成</span>
            </div>
            <div class="phase-status">
              <span :class="`review-badge ${getPhaseStatus(3)}`">
                {{ getReviewStatusText(getPhaseStatus(3)) }}
              </span>
              <span class="decision-badge" :class="`decision-${getPhaseDecision(3)}`">
                {{ getDecisionText(getPhaseDecision(3)) }}
              </span>
            </div>
            <button
              class="btn-run"
              :disabled="store.isRunning || getPhaseStatus(2) !== 'compliance_pass' || getPhaseDecision(2) !== 'confirmed'"
              @click="runPhase(3)"
            >
              {{ store.isRunning && store.currentPhase === 3 ? '执行中...' : '执行' }}
            </button>
          </div>
        </div>

        <div v-if="store.phaseMessage" class="phase-message">
          {{ store.phaseMessage }}
        </div>
      </aside>

      <!-- 右侧：内容区域 -->
      <main class="main-content">
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: activeTab === 'script' }"
            @click="activeTab = 'script'"
          >
            剧本输入
          </button>
          <button
            class="tab"
            :class="{ active: activeTab === 'output' }"
            @click="activeTab = 'output'"
          >
            阶段产出
          </button>
          <button
            class="tab"
            :class="{ active: activeTab === 'shots' }"
            @click="activeTab = 'shots'"
          >
            分镜预览
          </button>
        </div>

        <!-- 剧本输入 -->
        <div v-if="activeTab === 'script'" class="tab-content">
          <textarea
            v-model="editedScript"
            class="script-input"
            placeholder="请输入短剧剧本内容..."
          ></textarea>
          <div class="script-actions">
            <button class="btn btn-primary" :disabled="isSaving" @click="saveScript">
              {{ isSaving ? '保存中...' : '保存剧本' }}
            </button>
          </div>
        </div>

        <!-- 阶段产出 -->
        <div v-if="activeTab === 'output'" class="tab-content">
          <div class="output-list">
            <div v-for="phase in store.currentProject?.phases" :key="phase.id" class="output-item">
              <h4>阶段 {{ phase.phase_number }}: {{ phase.name }}</h4>
              <div class="output-status">
                <span :class="`review-badge ${getEffectiveReviewStatus(phase)}`">
                  {{ getReviewStatusText(getEffectiveReviewStatus(phase)) }}
                </span>
                <span class="decision-badge" :class="`decision-${phase.review_decision}`">
                  {{ getDecisionText(phase.review_decision) }}
                </span>
                <button class="text-toggle" @click="toggleReviewPanel(phase.id)">
                  {{ isReviewPanelExpanded(phase.id, phase.review_decision) ? '收起审核' : '展开审核' }}
                </button>
              </div>
              <div
                v-if="(getReviewSection(phase, 'business') || getReviewSection(phase, 'compliance')) && isReviewPanelExpanded(phase.id, phase.review_decision)"
                class="review-panel"
              >
                <div v-if="getReviewSection(phase, 'business')" class="review-section">
                  <div class="review-section-header">
                    <strong>业务审核：</strong>
                    <span>{{ getReviewResultText(getResolvedReviewResult(getReviewSection(phase, 'business'))) }}</span>
                    <button class="text-toggle" @click="toggleReviewTextExpanded(phase.id, 'business')">
                      {{ isReviewTextExpanded(phase.id, 'business') ? '收起文本' : '展开文本' }}
                    </button>
                  </div>
                  <p v-if="isReviewTextExpanded(phase.id, 'business')">{{ getReviewSummary(getReviewSection(phase, 'business')) }}</p>
                </div>
                <div v-if="getReviewSection(phase, 'compliance')" class="review-section">
                  <div class="review-section-header">
                    <strong>合规审核：</strong>
                    <span>{{ getReviewResultText(getResolvedReviewResult(getReviewSection(phase, 'compliance'))) }}</span>
                    <button class="text-toggle" @click="toggleReviewTextExpanded(phase.id, 'compliance')">
                      {{ isReviewTextExpanded(phase.id, 'compliance') ? '收起文本' : '展开文本' }}
                    </button>
                  </div>
                  <p v-if="isReviewTextExpanded(phase.id, 'compliance')">{{ getReviewSummary(getReviewSection(phase, 'compliance')) }}</p>
                </div>
                <textarea
                  v-model="decisionNoteByPhase[phase.id]"
                  class="decision-note"
                  placeholder="补充人工反馈，确认可留空；选择需要优化时建议填写具体修改意见"
                ></textarea>
                <div class="review-actions">
                  <button
                    class="btn btn-primary"
                    :disabled="store.isRunning || decisionLoadingByPhase[phase.id]"
                    @click="updatePhaseDecision(phase.id, 'confirmed')"
                  >
                    {{ decisionLoadingByPhase[phase.id] ? '提交中...' : '确认结果' }}
                  </button>
                  <button
                    class="btn btn-secondary"
                    :disabled="store.isRunning || decisionLoadingByPhase[phase.id]"
                    @click="updatePhaseDecision(phase.id, 'needs_optimization')"
                  >
                    需要优化
                  </button>
                </div>
                <p v-if="getDecisionFeedback(phase.id, phase.review_decision_note)" class="decision-feedback">
                  {{ getDecisionFeedback(phase.id, phase.review_decision_note) }}
                </p>
              </div>
              <div v-if="phase.output_data" class="result-panel">
                <button class="text-toggle" @click="toggleResultExpanded(phase.id)">
                  {{ isResultExpanded(phase.id) ? '收起结果' : '展开结果' }}
                </button>

                <div v-if="isResultExpanded(phase.id)" class="formatted-output">
                  <!-- Phase 1: 剧本分析 -->
                  <template v-if="phase.phase_number === 1">
                    <div v-if="getFormattedOutput(1, phase.output_data)?.plotBreakdown?.length" class="output-section">
                      <h5>剧情拆解</h5>
                      <div v-for="(item, idx) in getFormattedOutput(1, phase.output_data).plotBreakdown" :key="'pb-'+idx" class="card-item">
                        <div class="card-header">
                          <span class="card-title">第 {{ item.episode || item.集数 }} 集</span>
                          <span class="card-duration">{{ item.estimatedDuration || item.预计时长 || 0 }}s</span>
                        </div>
                        <p><strong>剧情点：</strong>{{ item.plotPoint || item.剧情点 }}</p>
                        <p><strong>核心冲突：</strong>{{ item.coreConflict || item.核心冲突 }}</p>
                        <p><strong>情感走向：</strong>{{ item.emotionalArc || item.情感走向 }}</p>
                        <p><strong>导演阐述：</strong>{{ item.directorNotes || item.导演阐述 }}</p>
                      </div>
                    </div>
                    <div v-if="getFormattedOutput(1, phase.output_data)?.characters?.length" class="output-section">
                      <h5>人物清单</h5>
                      <div class="cards-grid">
                        <div v-for="(char, idx) in getFormattedOutput(1, phase.output_data).characters" :key="'char-'+idx" class="mini-card">
                          <div class="mini-card-title">{{ char.name || char.姓名 }}</div>
                          <div class="mini-card-meta">{{ char.age || char.年龄 }}</div>
                          <div class="mini-card-content">{{ char.appearance || char.外观关键词 }}</div>
                          <span class="status-tag" :class="'status-' + (char.status || char.素材状态)">{{ char.status || char.素材状态 }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="getFormattedOutput(1, phase.output_data)?.scenes?.length" class="output-section">
                      <h5>场景清单</h5>
                      <div class="cards-grid">
                        <div v-for="(scene, idx) in getFormattedOutput(1, phase.output_data).scenes" :key="'scene-'+idx" class="mini-card">
                          <div class="mini-card-title">{{ scene.name || scene.场景名称 }}</div>
                          <div class="mini-card-meta">{{ scene.timeOfDay || scene.时间 }}</div>
                          <div class="mini-card-content">{{ scene.lightingTone || scene.lightingTone || scene.光线色调 }}</div>
                          <span class="status-tag" :class="'status-' + (scene.status || scene.素材状态)">{{ scene.status || scene.素材状态 }}</span>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- Phase 2: 服化道设计 -->
                  <template v-if="phase.phase_number === 2">
                    <div v-if="getFormattedOutput(2, phase.output_data)?.characterStyles?.length" class="output-section">
                      <h5>人物造型</h5>
                      <div v-for="(style, idx) in getFormattedOutput(2, phase.output_data).characterStyles" :key="'style-'+idx" class="card-item">
                        <div class="card-header">
                          <span class="card-title">{{ style.name }}</span>
                        </div>
                        <div class="prompt-box">{{ style.prompt }}</div>
                      </div>
                    </div>
                    <div v-if="getFormattedOutput(2, phase.output_data)?.sceneEnvironments?.length" class="output-section">
                      <h5>场景环境</h5>
                      <div v-for="(env, idx) in getFormattedOutput(2, phase.output_data).sceneEnvironments" :key="'env-'+idx" class="card-item">
                        <div class="card-header">
                          <span class="card-title">{{ env.name }}</span>
                        </div>
                        <div class="prompt-box">{{ env.prompt }}</div>
                      </div>
                    </div>
                  </template>

                  <!-- Phase 3: 分镜生成 -->
                  <template v-if="phase.phase_number === 3">
                    <div v-if="getFormattedOutput(3, phase.output_data)?.assetMapping?.length" class="output-section">
                      <h5>素材对应表</h5>
                      <table class="data-table">
                        <thead>
                          <tr><th>ID</th><th>类型</th><th>名称</th></tr>
                        </thead>
                        <tbody>
                          <tr v-for="(asset, idx) in getFormattedOutput(3, phase.output_data).assetMapping" :key="'asset-'+idx">
                            <td>{{ asset.assetId || asset.素材ID }}</td>
                            <td>{{ asset.type || asset.类型 }}</td>
                            <td>{{ asset.name || asset.名称 }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div v-if="getFormattedOutput(3, phase.output_data)?.shots?.length" class="output-section">
                      <h5>分镜列表</h5>
                      <div v-for="(shot, idx) in getFormattedOutput(3, phase.output_data).shots" :key="'shot-'+idx" class="card-item">
                        <div class="card-header">
                          <span class="card-title">镜头 {{ shot.shotNumber || shot.分镜号 }}</span>
                          <span class="card-duration">{{ shot.duration || shot.时长 }}s</span>
                        </div>
                        <p><strong>场景：</strong>{{ shot.scene }}</p>
                        <p><strong>人物：</strong>{{ shot.characters || shot.人物 }}</p>
                        <p><strong>镜头角度：</strong>{{ shot.cameraAngle || shot.镜头角度 }}</p>
                        <p><strong>镜头运动：</strong>{{ shot.cameraMovement || shot.镜头运动 }}</p>
                        <p><strong>动作要点：</strong>{{ shot.actionDescription || shot.动作要点 }}</p>
                        <div class="prompt-box"><strong>Seedance：</strong>{{ shot.seedancePrompt || shot.seedance提示词 }}</div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <p v-else class="output-empty">暂无产出</p>
            </div>

            <div v-if="!store.currentProject?.phases?.length" class="output-empty">
              暂无阶段产出，请先执行相应阶段
            </div>
          </div>
        </div>

        <!-- 分镜预览 -->
        <div v-if="activeTab === 'shots'" class="tab-content">
          <div v-if="store.currentProject?.shots?.length" class="shots-grid">
            <div v-for="shot in store.currentProject.shots" :key="shot.id" class="shot-card">
              <div class="shot-number">镜头 {{ shot.shot_number }}</div>
              <div class="shot-description">{{ shot.description }}</div>
              <div class="shot-details">
                <span>📷 {{ shot.camera_angle }}</span>
                <span>🎬 {{ shot.camera_movement }}</span>
                <span>⏱️ {{ shot.duration }}s</span>
              </div>
              <div v-if="shot.seedance_prompt" class="shot-prompt">
                <strong>Seedance 提示词：</strong>
                {{ shot.seedance_prompt }}
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            暂无分镜数据，请先完成分镜生成阶段
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.detail-container {
  min-height: 100vh;
  background: #f8fafc;
}

.detail-header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-back {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
}


.btn-back:hover {
  color: #2563eb;
}

.detail-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.status-idle { background: #f1f5f9; color: #64748b; }
.status-running { background: #dbeafe; color: #2563eb; }
.status-completed { background: #d1fae5; color: #059669; }
.status-failed { background: #fee2e2; color: #dc2626; }

.content-layout {
  display: flex;
  gap: 24px;
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.phase-panel {
  width: 280px;
  flex-shrink: 0;
}

.phase-panel h3 {
  font-size: 16px;
  margin-bottom: 16px;
  color: #1e293b;
}

.phase-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phase-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.phase-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.phase-number {
  width: 24px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.phase-name {
  font-weight: 500;
}

.phase-status {
  margin-bottom: 12px;
}

.review-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.review-badge.pending { background: #f1f5f9; color: #64748b; }
.review-badge.business_pass { background: #dbeafe; color: #2563eb; }
.review-badge.business_fail { background: #fee2e2; color: #dc2626; }
.review-badge.compliance_pass { background: #d1fae5; color: #059669; }
.review-badge.compliance_fail { background: #fee2e2; color: #dc2626; }

.decision-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
}

.decision-badge.decision-pending { background: #e2e8f0; color: #475569; }
.decision-badge.decision-confirmed { background: #dcfce7; color: #166534; }
.decision-badge.decision-needs_optimization { background: #fef3c7; color: #92400e; }

.btn-run {
  width: 100%;
  padding: 8px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-run:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-run:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.phase-message {
  margin-top: 16px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
}

.main-content {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  min-height: 600px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}

.tab {
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  border-radius: 6px;
}

.tab:hover {
  background: #f1f5f9;
}

.tab.active {
  background: #2563eb;
  color: white;
}

.tab-content {
  height: calc(100% - 60px);
}

.script-input {
  width: 100%;
  height: 400px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
}

.script-input:focus {
  outline: none;
  border-color: #2563eb;
}

.script-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #e2e8f0;
  color: #334155;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

.output-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.output-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.output-item h4 {
  font-size: 14px;
  margin-bottom: 8px;
}

.output-status {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.review-panel {
  margin-bottom: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.review-section + .review-section {
  margin-top: 10px;
}

.review-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.review-section strong {
  display: inline-block;
  margin-bottom: 4px;
}

.review-section p {
  margin: 6px 0 0;
  color: #475569;
  line-height: 1.5;
  white-space: pre-wrap;
}

.review-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.decision-note {
  width: 100%;
  min-height: 84px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  resize: vertical;
  font: inherit;
  color: #0f172a;
}

.decision-feedback {
  margin-top: 10px;
  font-size: 13px;
  color: #0f766e;
  white-space: pre-wrap;
}

.text-toggle {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.text-toggle:hover {
  color: #1d4ed8;
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.output-data {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
  overflow-x: auto;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
}

.output-empty {
  color: #94a3b8;
  font-size: 14px;
}

.formatted-output {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.output-section h5 {
  font-size: 14px;
  margin-bottom: 12px;
  color: #1e293b;
  font-weight: 600;
}

.card-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.card-item p {
  margin: 4px 0;
  font-size: 13px;
  color: #475569;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-weight: 600;
  color: #1e293b;
}

.card-duration {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.mini-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  position: relative;
}

.mini-card-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.mini-card-meta {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0;
}

.mini-card-content {
  font-size: 12px;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.status-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-tag.status-new, .status-tag.status-新增 {
  background: #dbeafe;
  color: #2563eb;
}

.status-tag.status-reuse, .status-tag.status-复用 {
  background: #d1fae5;
  color: #059669;
}

.status-tag.status-variant, .status-tag.status-变体 {
  background: #fef3c7;
  color: #92400e;
}

.prompt-box {
  background: #fef3c7;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;
  margin-top: 8px;
  white-space: pre-wrap;
  word-break: break-all;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th, .data-table td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
}

.shots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.shot-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
}

.shot-number {
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 8px;
}

.shot-description {
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.shot-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
}

.shot-prompt {
  font-size: 12px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 6px;
  color: #92400e;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #94a3b8;
}
</style>
