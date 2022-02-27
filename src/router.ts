import { createRouter, createWebHashHistory } from 'vue-router';
import danmuShow from './pages/danmuShow.vue';

const routes = [
  { path: '/', component: danmuShow },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes, // `routes: routes` 的缩写
});

export default router;