<template>
  <div class="login-container">
    <h1>Bienvenue dans Bomberman</h1>
    <input
      type="text"
      v-model="username"
      placeholder="Entrez votre nom d'utilisateur"
    />
    <button @click="login" :disabled="!username">Se connecter</button>
  </div>
</template>

<script>
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

export default {
  name: 'LoginComponent',
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const username = ref('');

    const login = () => {
      userStore.setUsername(username.value);
      router.push('/lobby');
    };

    return {
      username,
      login,
    };
  },
};
</script>
