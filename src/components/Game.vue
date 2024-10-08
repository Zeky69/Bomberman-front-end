<!-- src/components/Game.vue -->
<template>
  <div ref="gameContainer"></div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useRoute } from 'vue-router';
import Phaser from 'phaser';

export default {
  name: 'Game-component',
  setup() {
    const userStore = useUserStore();
    const route = useRoute();
    const roomId = route.params.roomId;
    const username = userStore.username;

    const game = ref(null);
    const socket = ref(null);
    const gameStarted = ref(false);
    const isCreator = ref(false);
    const playerList = ref([]);
    const gameContainer = ref(null);

    console.log('isCreator', isCreator.value);


    // const players = reactive({});
    // const walls = ref([]);
    // const bombs = ref([]);
    // const explosions = ref([]);
    // const powerups = ref([]);

    let cursors;
    let spaceBar;
    let playerSprites = {};
    let bombSprites;
    let explosionSprites;
    let powerupSprites;
    let wallSprites;
    let waitingText;
    let startButton;

    const initWebSocket = () => {
      const wsUrl = `ws://localhost:8000/ws/${roomId}/${username}`;
      socket.value = new WebSocket(wsUrl);

      socket.value.onopen = () => {
        console.log('WebSocket connection established');
      };

      socket.value.onmessage = onSocketMessage;

      socket.value.onclose = () => {
        console.log('WebSocket connection closed');
      };
    };

    const onSocketMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === 'game_state') {
        console.log('Mise à jour de l\'état du jeu');
        updateGameState(message.state);
      } else if (message.event === 'game_action') {
        applyGameAction(message.username, message.action);
      } else if (message.event === 'player_joined') {
        console.log(`${message.username} a rejoint la partie`);
        playerList.value = message.players;
        if (message.creator) {
          isCreator.value = username === message.creator;
          console.log('isCreator', isCreator.value);

        }
      } else if (message.event === 'player_left') {
        console.log(`${message.username} a quitté la partie`);
        playerList.value = message.players;
      } else if (message.event === 'game_started') {
        console.log('La partie a commencé');
        gameStarted.value = true;
      } else if (message.event === 'game_stopped') {
        console.log('La partie a été arrêtée');
        gameStarted.value = false;
      } else if (message.error) {
        alert(`Erreur: ${message.error}`);
      }
    };

    const sendAction = (action) => {
      if (socket.value && socket.value.readyState === WebSocket.OPEN) {
        socket.value.send(
          JSON.stringify({
            event: 'game_action',
            action,
          })
        );
      }
    };

    const initPhaser = () => {
      const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 800,
        backgroundColor: '#222222',
        physics: {
          default: 'arcade',
          arcade: {
            debug: true,
          },
        },
        parent: gameContainer.value,
        scene: {
          preload: preload,
          create: create,
          update: update,
        },
      };
      game.value = new Phaser.Game(config);
    };

    const preload = function () {
      // Pas de ressources externes pour le moment
    };

    const create = function () {
      // Initialisation des touches
      cursors = this.input.keyboard.createCursorKeys();
      spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      // Groupes pour les différents éléments
      playerSprites = {};
      bombSprites = this.physics.add.group();
      explosionSprites = this.physics.add.group();
      powerupSprites = this.physics.add.group();

      // Création des murs
      wallSprites = this.physics.add.staticGroup();

      // Afficher un message en attendant que le jeu commence
      waitingText = this.add.text(400, 400, 'En attente du démarrage de la partie...', {
        fontSize: '24px',
        fill: '#ffffff',
      });
      waitingText.setOrigin(0.5);

      // Bouton pour démarrer le jeu (seulement pour le créateur)

      startButton = this.add.text(400, 450, 'Démarrer la partie', {
        fontSize: '24px',
        fill: '#00ff00',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 },
      });
      startButton.setOrigin(0.5);
      startButton.setInteractive();
      startButton.on('pointerdown', startGame);

    };

    let lastDirection = null;

    const update = function (time, delta) {
      if (!gameStarted.value) {
        return;
      }

      let currentDirection = null;

      if (cursors.left.isDown) {
        currentDirection = 'left';
      } else if (cursors.right.isDown) {
        currentDirection = 'right';
      } else if (cursors.up.isDown) {
        currentDirection = 'up';
      } else if (cursors.down.isDown) {
        currentDirection = 'down';
      }

      if (currentDirection && currentDirection !== lastDirection) {
        sendAction({ type: 'start_move', direction: currentDirection });
        lastDirection = currentDirection;
      } else if (!currentDirection && lastDirection !== null) {
        sendAction({ type: 'stop_move' });
        lastDirection = null;
      }

      if (Phaser.Input.Keyboard.JustDown(spaceBar)) {
        sendAction({ type: 'place_bomb' });
      }
    };

    const updateGameState = (state) => {
      // Suppression du message d'attente
      if (waitingText) {
        waitingText.destroy();
        waitingText = null;
      }
      if (startButton) {
        startButton.destroy();
        startButton = null;
      }


      // Mise à jour des murs
      updateWalls(state.map);

      // Mise à jour des joueurs
      updatePlayers(state.players);

      // Mise à jour des bombes
      updateBombs(state.bombs);

      // Mise à jour des explosions
      updateExplosions(state.explosions);

      // Mise à jour des power-ups
      updatePowerups(state.powerups);
    };

    const updateWalls = (mapData) => {
      // Suppression des anciens murs
      wallSprites.clear(true, true);

      // Murs incassables
      mapData.walls.forEach((wall) => {
        const x = wall[0] * 50 + 25;
        const y = wall[1] * 50 + 25;
        const wallSprite = wallSprites.create(x, y, null);
        wallSprite.displayWidth = 50;
        wallSprite.displayHeight = 50;
        wallSprite.setTint(0x000000);
        wallSprite.refreshBody();
      });

      // Murs cassables
      mapData.breakable_walls.forEach((wall) => {
        const x = wall[0] * 50 + 25;
        const y = wall[1] * 50 + 25;
        const wallSprite = wallSprites.create(x, y, null);
        wallSprite.displayWidth = 50;
        wallSprite.displayHeight = 50;
        wallSprite.setTint(0x8b4513); // Couleur marron pour les murs cassables
        wallSprite.refreshBody();
      });
    };

    const updatePlayers = (playersData) => {
      // Mise à jour des sprites des joueurs
      for (const [playerName, playerData] of Object.entries(playersData)) {
        if (!playerSprites[playerName]) {
          // Création du sprite du joueur
          const color = playerName === username ? 0x00ff00 : 0x0000ff;
          const playerSprite = game.value.scene.scenes[0].add.rectangle(0, 0, 40, 40, color);
          game.value.scene.scenes[0].physics.add.existing(playerSprite);
          playerSprite.body.setCollideWorldBounds(true);
          playerSprite.body.setSize(40, 40);
          playerSprites[playerName] = playerSprite;

          // Collision avec les murs
          game.value.scene.scenes[0].physics.add.collider(playerSprite, wallSprites);
        }
        const sprite = playerSprites[playerName];
        sprite.x = playerData.position[0] * 50 + 25;
        sprite.y = playerData.position[1] * 50 + 25;

        // Si le joueur n'est plus en vie, le rendre invisible
        if (!playerData.alive) {
          sprite.setVisible(false);
        } else {
          sprite.setVisible(true);
        }
      }
    };

    const updateBombs = (bombsData) => {
      // Suppression des bombes existantes
      bombSprites.clear(true, true);

      bombsData.forEach((bomb) => {
        const x = bomb.position[0] * 50 + 25;
        const y = bomb.position[1] * 50 + 25;
        const bombSprite = bombSprites.create(x, y, null);
        bombSprite.displayWidth = 30;
        bombSprite.displayHeight = 30;
        bombSprite.setTint(0x000000);
        bombSprite.body.setImmovable(true);
      });
    };

    const updateExplosions = (explosionsData) => {
      // Suppression des explosions existantes
      explosionSprites.clear(true, true);

      explosionsData.forEach((explosion) => {
        explosion.positions.forEach((pos) => {
          const x = pos[0] * 50 + 25;
          const y = pos[1] * 50 + 25;
          const explosionSprite = explosionSprites.create(x, y, null);
          explosionSprite.displayWidth = 50;
          explosionSprite.displayHeight = 50;
          explosionSprite.setTint(0xff0000);
          explosionSprite.body.setImmovable(true);
        });
      });
    };

    const updatePowerups = (powerupsData) => {
      // Suppression des power-ups existants
      powerupSprites.clear(true, true);

      powerupsData.forEach((powerup) => {
        const x = powerup.position[0] * 50 + 25;
        const y = powerup.position[1] * 50 + 25;
        const color =
          powerup.type === 'speed'
            ? 0xffff00
            : powerup.type === 'bomb_range'
              ? 0xff00ff
              : 0x00ffff;
        const powerupSprite = powerupSprites.create(x, y, null);
        powerupSprite.displayWidth = 30;
        powerupSprite.displayHeight = 30;
        powerupSprite.setTint(color);
        powerupSprite.body.setImmovable(true);
      });
    };

    const applyGameAction = (playerName, action) => {
      // Vous pouvez gérer les actions des autres joueurs si nécessaire

    };

    const startGame = () => {
      if (socket.value && socket.value.readyState === WebSocket.OPEN) {
        socket.value.send(
          JSON.stringify({
            event: 'start_game',
          })
        );
      }
    };

    onMounted(() => {
      initWebSocket();
      initPhaser();
    });

    return {
      gameContainer,
      isCreator,
      playerList,

    };
  },
};
</script>

<style scoped>
/* Styles spécifiques au composant */
</style>
