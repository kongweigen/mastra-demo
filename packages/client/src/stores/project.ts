import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Project, SSEEvent } from '@/types';
import { projectApi, sseApi, phaseApi } from '@/api';

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const isRunning = ref(false);
  const currentPhase = ref<number | null>(null);
  const phaseMessage = ref('');
  const eventSource = ref<EventSource | null>(null);

  const sortedProjects = computed(() => {
    return [...projects.value].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  async function fetchProjects() {
    projects.value = await projectApi.getAll();
  }

  async function fetchProject(id: string) {
    currentProject.value = await projectApi.getById(id);
  }

  async function createProject(title: string, script: string) {
    const project = await projectApi.create(title, script);
    projects.value.unshift(project);
    return project;
  }

  async function updateProject(id: string, data: { title?: string; script?: string }) {
    const project = await projectApi.update(id, data);
    const index = projects.value.findIndex((p) => p.id === id);
    if (index !== -1) {
      projects.value[index] = project;
    }
    if (currentProject.value?.id === id) {
      currentProject.value = { ...currentProject.value, ...project };
    }
    return project;
  }

  async function deleteProject(id: string) {
    await projectApi.delete(id);
    projects.value = projects.value.filter((p) => p.id !== id);
    if (currentProject.value?.id === id) {
      currentProject.value = null;
    }
  }

  async function runPhase(projectId: string, phase: number) {
    isRunning.value = true;
    currentPhase.value = phase;
    phaseMessage.value = '';

    await projectApi.runPhase(projectId, phase);
  }

  async function updatePhaseDecision(phaseId: string, decision: 'pending' | 'confirmed' | 'needs_optimization', note = '') {
    const phase = await phaseApi.updateDecision(phaseId, decision, note);

    if (currentProject.value) {
      currentProject.value = {
        ...currentProject.value,
        phases: (currentProject.value.phases || []).map((item) => (item.id === phase.id ? phase : item)),
      };
    }

    return phase;
  }

  function subscribeToSSE(projectId: string) {
    disconnectSSE();

    eventSource.value = sseApi.connect(projectId, (event) => {
      const data: SSEEvent = JSON.parse(event.data);

      switch (data.type) {
        case 'phase_start':
          currentPhase.value = data.phase || null;
          isRunning.value = true;
          break;
        case 'phase_progress':
          phaseMessage.value = data.message || '';
          break;
        case 'phase_review':
          phaseMessage.value =
            data.comments ||
            (data.reviewStage === 'business'
              ? data.reviewResult === 'PASS'
                ? '业务审核通过'
                : '业务审核未通过'
              : data.reviewStage === 'compliance'
                ? data.reviewResult === 'PASS'
                  ? '合规审核通过'
                  : '合规审核未通过'
                : data.status || '审核完成');
          // 刷新项目数据
          fetchProject(projectId);
          break;
        case 'phase_decision':
          phaseMessage.value =
            data.message ||
            (data.decision === 'confirmed'
              ? '已确认当前审核结果'
              : data.decision === 'needs_optimization'
                ? '已标记为需要优化，正在重新执行当前阶段'
                : '人工决策已更新');
          if (data.decision === 'needs_optimization') {
            isRunning.value = true;
            currentPhase.value = data.phase || currentPhase.value;
          }
          fetchProject(projectId);
          break;
        case 'phase_complete':
          isRunning.value = false;
          phaseMessage.value = '完成';
          fetchProject(projectId);
          break;
        case 'error':
          isRunning.value = false;
          phaseMessage.value = data.message || '错误';
          break;
      }
    });
  }

  function disconnectSSE() {
    if (eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
    }
  }

  return {
    projects,
    sortedProjects,
    currentProject,
    isRunning,
    currentPhase,
    phaseMessage,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    runPhase,
    updatePhaseDecision,
    subscribeToSSE,
    disconnectSSE,
  };
});
