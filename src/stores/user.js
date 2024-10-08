// src/stores/user.js
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    username: '',
    roomId: '',
  }),
  actions: {
    setUsername(name) {
      this.username = name;
    },
    setRoomId(id) {
      this.roomId = id;
    },
  },
});
