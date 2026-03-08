import axios from 'axios';
import type { Project, Phase } from '@/types';

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
