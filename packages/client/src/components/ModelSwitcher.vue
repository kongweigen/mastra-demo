<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { settingsApi } from '@/api';

const selectedModel = ref('');
const availableModels = ref<string[]>([]);
const isLoading = ref(false);
const isUpdating = ref(false);
const errorMessage = ref('');

async function loadSettings() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const settings = await settingsApi.getModel();
    selectedModel.value = settings.model;
    availableModels.value = settings.availableModels;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载模型配置失败';
  } finally {
    isLoading.value = false;
  }
}

async function changeModel() {
  if (!selectedModel.value) {
    return;
  }

  isUpdating.value = true;
  errorMessage.value = '';

  try {
    const settings = await settingsApi.updateModel(selectedModel.value);
    selectedModel.value = settings.model;
    availableModels.value = settings.availableModels;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '切换模型失败';
  } finally {
    isUpdating.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="model-switcher">
    <label class="model-label" for="model-switcher-select">模型</label>
    <select
      id="model-switcher-select"
      v-model="selectedModel"
      class="model-select"
      :disabled="isLoading || isUpdating"
      @change="changeModel"
    >
      <option v-for="model in availableModels" :key="model" :value="model">
        {{ model }}
      </option>
    </select>
    <span class="model-status">{{ isUpdating ? '切换中...' : selectedModel || '未配置' }}</span>
    <span v-if="errorMessage" class="model-error">{{ errorMessage }}</span>
  </div>
</template>

<style scoped>
.model-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.model-label {
  font-size: 13px;
  color: #64748b;
}

.model-select {
  min-width: 220px;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #0f172a;
}

.model-status {
  font-size: 12px;
  color: #475569;
}

.model-error {
  font-size: 12px;
  color: #dc2626;
}
</style>
