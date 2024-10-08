// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import Lobby from '../components/Lobby.vue';
import Game from '../components/Game.vue';

const routes = [
  { path: '/', name: 'Login', component: Login },
  { path: '/lobby', name: 'Lobby', component: Lobby },
  { path: '/game/:roomId', name: 'Game', component: Game, props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
