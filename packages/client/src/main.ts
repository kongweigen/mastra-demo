import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';

// Views
import ProjectList from './views/ProjectList.vue';
import ProjectDetail from './views/ProjectDetail.vue';

const routes = [
  { path: '/', name: 'home', component: ProjectList },
  { path: '/project/:id', name: 'project', component: ProjectDetail },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
