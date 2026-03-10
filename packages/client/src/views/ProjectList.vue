<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '@/stores/project';

const router = useRouter();
const store = useProjectStore();

const showCreateModal = ref(false);
const newTitle = ref('');
const newScript = ref('');
const isCreating = ref(false);

onMounted(() => {
  store.fetchProjects();
});

async function createProject() {
  if (!newTitle.value.trim()) return;

  isCreating.value = true;
  try {
    const project = await store.createProject(newTitle.value, newScript.value);
    showCreateModal.value = false;
    newTitle.value = '';
    newScript.value = '';
    router.push(`/project/${project.id}`);
  } finally {
    isCreating.value = false;
  }
}

function openProject(id: string) {
  router.push(`/project/${id}`);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    idle: '待开始',
    running: '进行中',
    completed: '已完成',
    failed: '失败',
  };
  return map[status] || status;
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    idle: 'status-idle',
    running: 'status-running',
    completed: 'status-completed',
    failed: 'status-failed',
  };
  return map[status] || '';
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>短剧分镜生成系统</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateModal = true">新建项目</button>
      </div>
    </header>

    <div class="projects-grid">
      <div
        v-for="project in store.sortedProjects"
        :key="project.id"
        class="project-card"
        @click="openProject(project.id)"
      >
        <div class="project-title">{{ project.title }}</div>
        <div class="project-meta">
          <span class="project-date">{{ formatDate(project.created_at) }}</span>
          <span class="project-status" :class="getStatusClass(project.status)">
            {{ getStatusText(project.status) }}
          </span>
        </div>
        <div class="project-preview">
          {{ project.script.slice(0, 100) }}{{ project.script.length > 100 ? '...' : '' }}
        </div>
      </div>

      <div v-if="store.projects.length === 0" class="empty-state">
        <p>暂无项目，点击"新建项目"开始</p>
      </div>
    </div>

    <!-- 创建项目弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h2>新建项目</h2>
        <div class="form-group">
          <label>项目标题</label>
          <input v-model="newTitle" type="text" placeholder="输入项目标题" />
        </div>
        <div class="form-group">
          <label>剧本内容</label>
          <textarea
            v-model="newScript"
            placeholder="输入短剧剧本内容"
            rows="10"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" :disabled="!newTitle.trim() || isCreating" @click="createProject">
            {{ isCreating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-date {
  font-size: 12px;
  color: #9ca3af;
}

.project-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-idle {
  background: #f3f4f6;
  color: #6b7280;
}

.status-running {
  background: #dbeafe;
  color: #2563eb;
}

.status-completed {
  background: #d1fae5;
  color: #059669;
}

.status-failed {
  background: #fee2e2;
  color: #dc2626;
}

.project-preview {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
}

.modal h2 {
  font-size: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #374151;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
