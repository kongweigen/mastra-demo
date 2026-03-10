import axios from 'axios';
import type { Project, Phase, ModelSettings, ManagedAgent, ManagedSkill, StudioBootstrap } from '@/types';

const api = axios.create({
  baseURL: '/api',
});

export const projectApi = {
  getAll: () => api.get<Project[]>('/projects').then((res) => res.data),

  getById: (id: string) => api.get<Project>(`/projects/${id}`).then((res) => res.data),

  create: (title: string, script: string) =>
    api.post<Project>('/projects', { title, script }).then((res) => res.data),

  update: (id: string, data: { title?: string; script?: string }) =>
    api.put<Project>(`/projects/${id}`, data).then((res) => res.data),

  delete: (id: string) => api.delete(`/projects/${id}`),

  runPhase: (id: string, phase: number) =>
    api.post(`/projects/${id}/run`, { phase }).then((res) => res.data),
};

export const phaseApi = {
  getByProject: (projectId: string) =>
    api.get<Phase[]>(`/phases/project/${projectId}`).then((res) => res.data),

  getById: (id: string) => api.get<Phase>(`/phases/${id}`).then((res) => res.data),

  updateReview: (id: string, status: string, comments: string) =>
    api.patch<Phase>(`/phases/${id}/review`, { status, comments }).then((res) => res.data),

  updateDecision: (id: string, decision: 'pending' | 'confirmed' | 'needs_optimization', note = '') =>
    api.patch<Phase>(`/phases/${id}/decision`, { decision, note }).then((res) => res.data),
};

export const sseApi = {
  connect: (projectId: string, onMessage: (event: MessageEvent) => void) => {
    const eventSource = new EventSource(`/api/sse/${projectId}`);
    eventSource.onmessage = onMessage;
    return eventSource;
  },
};

export const settingsApi = {
  getModel: () => api.get<ModelSettings>('/settings/model').then((res) => res.data),

  updateModel: (model: string) =>
    api.patch<ModelSettings>('/settings/model', { model }).then((res) => res.data),
};

export const studioApi = {
  bootstrap: () => api.get<StudioBootstrap>('/studio/bootstrap').then((res) => res.data),

  listSkills: () => api.get<ManagedSkill[]>('/studio/skills').then((res) => res.data),

  createSkill: (data: { name: string; description: string; instructions: string }) =>
    api.post<ManagedSkill>('/studio/skills', data).then((res) => res.data),

  updateSkill: (name: string, data: { description?: string; instructions?: string }) =>
    api.put<ManagedSkill>(`/studio/skills/${encodeURIComponent(name)}`, data).then((res) => res.data),

  listAgents: () => api.get<ManagedAgent[]>('/studio/agents').then((res) => res.data),

  createAgent: (data: Omit<ManagedAgent, 'id' | 'updatedAt'> & { key?: string }) =>
    api.post<ManagedAgent>('/studio/agents', data).then((res) => res.data),

  updateAgent: (id: string, data: Partial<Omit<ManagedAgent, 'id' | 'updatedAt'>>) =>
    api.put<ManagedAgent>(`/studio/agents/${encodeURIComponent(id)}`, data).then((res) => res.data),
};
