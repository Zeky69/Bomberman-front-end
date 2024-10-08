<!-- src/components/Lobby.vue -->
<template>
  <div class="lobby-container">
    <h2>Bonjour, {{ username }}</h2>
    <div class="room-actions">
      <h3>Créer une salle</h3>
      <input
        type="text"
        v-model="newRoomId"
        placeholder="Nom de la nouvelle salle"
      />
      <button @click="createRoom" :disabled="!newRoomId">Créer</button>
    </div>
    <div class="room-list">
      <h3>Rejoindre une salle existante</h3>
      <ul>
        <li v-for="room in rooms" :key="room.room_id">
          {{ room.room_id }} - started {{ room.game_started }} - {{ room.players }} joueurs - {{ room.creator }} Créateur
          <button @click="joinRoom(room.room_id)">Rejoindre</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
import { onMounted, ref } from 'vue'

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Lobby',
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const newRoomId = ref('');
    const rooms = ref([]);

    const fetchRooms = async () => {
      try {
        const response = await axios.get('http://localhost:8000/list_rooms');
        rooms.value = response.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des salles:', error);
      }
    };

    const createRoom = async () => {
      try {
        await axios.post('http://localhost:8000/create_room', {
          room_id: newRoomId.value,
          username: userStore.username,
        });
        joinRoom(newRoomId.value);
      } catch (error) {
        console.error('Erreur lors de la création de la salle:', error);
        alert('Erreur lors de la création de la salle.');
      }
    };

    const joinRoom = (roomId) => {
      userStore.setRoomId(roomId);
      router.push(`/game/${roomId}`);
    };

    onMounted(() => {
      fetchRooms();
    });

    return {
      username: userStore.username,
      newRoomId,
      rooms,
      createRoom,
      joinRoom,
    };
  },
};
</script>

<style scoped>
/* Styles identiques à ceux fournis précédemment */
</style>
