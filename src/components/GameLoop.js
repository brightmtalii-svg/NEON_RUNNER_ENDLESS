import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrackGenerator } from './TrackGenerator.js';
import { InputHandler } from './InputHandler.js';
import { createPlayerBox } from './CollisionDetector.js';

const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
};

const LANE_TARGETS = [-3, 0, 3];

export class GameLoop {
  constructor() {
    this.state = STATES.MENU;
    this.score = 0;
    this.coins = 0;
    this.speed = 14;
    this.laneIndex = 1;
    this.laneTargetX = 0;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.jumpQueued = false;

    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05010f);
    this.scene.fog = new THREE.FogExp2(0x05010f, 0.035);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 240);
    this.camera.position.set(0, 5, -10);

    this.clock = new THREE.Clock();
    this.playerBox = new THREE.Box3();

    this.addLights();
    this.player = this.createPlayer();
    this.scene.add(this.player);

    this.track = new TrackGenerator(this.scene);
    this.input = new InputHandler(this);

    this.setupParticles();
    this.cacheDom();
    this.bindEvents();
    this.loadCyberAvatar();

    requestAnimationFrame(this.frame.bind(this));
  }

  addLights() {
    const ambient = new THREE.AmbientLight(0x223355, 0.7);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0x00f7ff, 1.1);
    key.position.set(-4, 10, -6);
    this.scene.add(key);

    const rim = new THREE.PointLight(0xb400ff, 1.4, 80);
    rim.position.set(4, 6, 10);
    this.scene.add(rim);
  }

  createPlayer() {
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f7ff,
      emissive: 0x003344,
      metalness: 0.45,
      roughness: 0.25,
    });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 8, 16), bodyMaterial);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xff2d55, emissive: 0xff2d55, emissiveIntensity: 1.2 }),
    );
    visor.position.set(0, 1.32, 0.28);
    group.add(visor);

    return group;
  }

  async loadCyberAvatar() {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync('/models/runner.glb');
      const avatar = gltf.scene;
      avatar.scale.setScalar(1.1);
      avatar.position.y = 0;
      this.player.children.slice().forEach((child) => this.player.remove(child));
      this.player.add(avatar);
    } catch {
      // The procedural fallback avatar remains active if no GLTF is bundled.
    }
  }

  setupParticles() {
    const count = 180;
    this.particlePositions = new Float32Array(count * 3);
    this.particleVelocities = new Array(count);
    this.particleLife = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      this.particleVelocities[i] = new THREE.Vector3();
      this.particleLife[i] = 0;
      this.particlePositions[i * 3 + 1] = -100;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff6a00,
      size: 0.09,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.position.set(0, 0.08, -0.3);
    this.player.add(this.particles);
    this.particleEmitAccumulator = 0;
  }

  updateParticles(delta, running) {
    const positions = this.particlePositions;

    for (let i = 0; i < this.particleLife.length; i += 1) {
      if (this.particleLife[i] > 0) {
        this.particleLife[i] -= delta;
        positions[i * 3] += this.particleVelocities[i].x * delta;
        positions[i * 3 + 1] += this.particleVelocities[i].y * delta;
        positions[i * 3 + 2] += this.particleVelocities[i].z * delta;
        this.particleVelocities[i].y -= 14 * delta;

        if (this.particleLife[i] <= 0) {
          positions[i * 3 + 1] = -100;
        }
      }
    }

    if (running && this.isGrounded) {
      this.particleEmitAccumulator += delta;
      const emitEvery = 0.012;
      while (this.particleEmitAccumulator >= emitEvery) {
        this.particleEmitAccumulator -= emitEvery;
        this.emitParticle();
      }
    } else {
      this.particleEmitAccumulator = 0;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  emitParticle() {
    for (let i = 0; i < this.particleLife.length; i += 1) {
      if (this.particleLife[i] <= 0) {
        this.particleLife[i] = 0.45 + Math.random() * 0.25;
        this.particlePositions[i * 3] = (Math.random() - 0.5) * 0.25;
        this.particlePositions[i * 3 + 1] = 0.05;
        this.particlePositions[i * 3 + 2] = -0.2;
        this.particleVelocities[i].set(
          (Math.random() - 0.5) * 2.2,
          1.4 + Math.random() * 1.8,
          -3.2 - Math.random() * 2.8,
        );
        break;
      }
    }
  }

  cacheDom() {
    this.menuScreen = document.getElementById('menu-screen');
    this.gameOverScreen = document.getElementById('gameover-screen');
    this.hud = document.getElementById('hud');
    this.scoreValue = document.getElementById('score-value');
    this.coinsValue = document.getElementById('coins-value');
    this.finalScore = document.getElementById('final-score');
    this.finalCoins = document.getElementById('final-coins');
    this.syncSpinner = document.getElementById('sync-spinner');
    this.syncStatus = document.getElementById('sync-status');
    this.leaderboardBody = document.querySelector('#leaderboard-table tbody');
  }

  bindEvents() {
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('leaderboard-btn').addEventListener('click', () => this.openLeaderboard());
    window.addEventListener('resize', () => this.onResize());
  }

  startGame() {
    this.state = STATES.PLAYING;
    this.score = 0;
    this.coins = 0;
    this.speed = 14;
    this.laneIndex = 1;
    this.laneTargetX = 0;
    this.player.position.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.track.reset();
    this.syncSpinner.classList.add('spinning');
    this.syncStatus.textContent = 'API Syncing...';
    this.menuScreen.classList.add('is-hidden');
    this.gameOverScreen.classList.add('is-hidden');
    this.hud.classList.remove('is-hidden');
  }

  requestJump() {
    if (this.state !== STATES.PLAYING) return;
    if (this.isGrounded) {
      this.jumpQueued = true;
    }
  }

  moveLane(direction) {
    if (this.state !== STATES.PLAYING) return;
    this.laneIndex = THREE.MathUtils.clamp(this.laneIndex + direction, 0, LANE_TARGETS.length - 1);
    this.laneTargetX = LANE_TARGETS[this.laneIndex];
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async endGame() {
    this.state = STATES.GAME_OVER;
    this.hud.classList.add('is-hidden');
    this.gameOverScreen.classList.remove('is-hidden');
    this.finalScore.textContent = Math.floor(this.score).toLocaleString();
    this.finalCoins.textContent = String(this.coins);
    await this.syncScore();
  }

  async syncScore() {
    this.syncSpinner.classList.add('spinning');
    this.syncStatus.textContent = 'API Syncing...';

    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Neon Runner',
          score: Math.floor(this.score),
          coins: this.coins,
        }),
      });

      if (!response.ok) throw new Error('Leaderboard sync failed');
      const data = await response.json();
      this.renderLeaderboard(data.leaderboard || []);
      this.syncStatus.textContent = 'Synced';
    } catch (error) {
      this.syncStatus.textContent = 'Offline mode';
      this.renderLeaderboard([
        { rank: 1, name: 'Needles Runner', score: 36 },
        { rank: 2, name: 'Leadless Runner', score: 29 },
        { rank: 3, name: 'Paegion Runner', score: 9 },
      ]);
    } finally {
      this.syncSpinner.classList.remove('spinning');
    }
  }

  async openLeaderboard() {
    this.state = STATES.GAME_OVER;
    this.hud.classList.add('is-hidden');
    this.gameOverScreen.classList.remove('is-hidden');
    this.finalScore.textContent = '0';
    this.finalCoins.textContent = '0';
    this.syncSpinner.classList.add('spinning');
    this.syncStatus.textContent = 'Loading...';

    try {
      const response = await fetch('/api/leaderboard', { method: 'GET' });
      if (!response.ok) throw new Error('Leaderboard load failed');
      const data = await response.json();
      this.renderLeaderboard(data.leaderboard || []);
      this.syncStatus.textContent = 'Synced';
    } catch {
      this.renderLeaderboard([
        { rank: 1, name: 'Needles Runner', score: 36 },
        { rank: 2, name: 'Leadless Runner', score: 29 },
        { rank: 3, name: 'Paegion Runner', score: 9 },
      ]);
      this.syncStatus.textContent = 'Offline mode';
    } finally {
      this.syncSpinner.classList.remove('spinning');
    }
  }

  renderLeaderboard(entries) {
    this.leaderboardBody.innerHTML = '';
    entries.slice(0, 10).forEach((entry, index) => {
      const row = document.createElement('tr');
      const rank = entry.rank || index + 1;
      const name = entry.name || 'Runner';
      const score = entry.score ?? 0;
      row.innerHTML = `<td>${rank}</td><td>${this.escapeHtml(name)}</td><td>${score}</td>`;
      this.leaderboardBody.appendChild(row);
    });
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  update(delta) {
    if (this.state !== STATES.PLAYING) {
      return;
    }

    this.speed = 14 + Math.min(this.score / 180, 13);
    this.track.update(delta, this.speed);

    if (this.jumpQueued) {
      this.verticalVelocity = 6.4;
      this.isGrounded = false;
      this.jumpQueued = false;
    }

    this.verticalVelocity -= 18 * delta;
    this.player.position.y += this.verticalVelocity * delta;
    if (this.player.position.y <= 0) {
      this.player.position.y = 0;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }

    this.player.position.x = THREE.MathUtils.lerp(
      this.player.position.x,
      this.laneTargetX,
      Math.min(1, 9 * delta),
    );

    this.score += delta * 18;
    this.coins = Math.floor(this.score / 55);

    this.updateParticles(delta, true);

    this.scoreValue.textContent = Math.floor(this.score).toLocaleString();
    this.coinsValue.textContent = String(this.coins);

    createPlayerBox(this.player, this.playerBox);
    const colliders = this.track.getColliders();
    const hit = colliders.some((mesh) => {
      mesh.updateMatrixWorld(true);
      const obstacleBox = new THREE.Box3().setFromObject(mesh);
      return this.playerBox.intersectsBox(obstacleBox);
    });

    const desiredCamera = this.player.position.clone().add(new THREE.Vector3(0, 5, -10));
    this.camera.position.lerp(desiredCamera, Math.min(1, 7 * delta));
    this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.1, 7)));

    if (hit) {
      this.endGame();
    }
  }

  frame() {
    requestAnimationFrame(this.frame.bind(this));
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

const game = new GameLoop();
window.neonRunner = game;
