<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ModelSwitcher from '@/components/ModelSwitcher.vue';

const route = useRoute();

const isStudio = computed(() => route.path.startsWith('/studio'));
</script>

<template>
  <header class="app-header">
    <div class="inner">
      <nav class="left">
        <RouterLink class="brand" to="/">
          <span class="brand-mark">CF</span>
          <span class="brand-text">Chatfire Mastra Demo</span>
        </RouterLink>
        <RouterLink class="nav-link" :class="{ active: isStudio }" to="/studio">Studio</RouterLink>
      </nav>

      <div class="right">
        <ModelSwitcher />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.45);
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #0f172a;
  min-width: 0;
}

.brand-mark {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(16, 185, 129, 0.14));
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.brand-text {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-link {
  font-size: 13px;
  text-decoration: none;
  color: #334155;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.nav-link:hover {
  background: rgba(148, 163, 184, 0.14);
  border-color: rgba(148, 163, 184, 0.25);
}

.nav-link.active {
  background: rgba(37, 99, 235, 0.1);
  border-color: rgba(37, 99, 235, 0.25);
  color: #1d4ed8;
}

.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 620px) {
  .brand-text {
    display: none;
  }
}
</style>

