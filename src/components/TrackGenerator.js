import * as THREE from 'three';

const TILE_LENGTH = 20;
const MAX_TILES = 6;
const LANE_X = [-3, 0, 3];

export class TrackGenerator {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];
    this.nextZ = 0;
    this.speed = 14;

    for (let i = 0; i < MAX_TILES; i += 1) {
      this.addTile();
    }
  }

  reset() {
    this.tiles.forEach((tile) => this.disposeTile(tile));
    this.tiles = [];
    this.nextZ = 0;
    for (let i = 0; i < MAX_TILES; i += 1) {
      this.addTile();
    }
  }

  addTile() {
    const startZ = this.nextZ;
    const centerZ = startZ + TILE_LENGTH / 2;
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    const grid = new THREE.GridHelper(TILE_LENGTH, 20, 0x00f7ff, 0x003b4d);
    grid.position.set(0, 0, centerZ);
    group.add(grid);

    const wallGeometry = new THREE.BoxGeometry(0.12, 2.2, TILE_LENGTH);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xff2d55,
      emissive: 0xff2d55,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.95,
    });

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    leftWall.position.set(-5, 1.1, centerZ);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    rightWall.position.set(5, 1.1, centerZ);
    group.add(rightWall);

    const obstacles = [];
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i += 1) {
      const laneIndex = Math.floor(Math.random() * LANE_X.length);
      const laneX = LANE_X[laneIndex];
      const obstacle = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 1.25, 1.15),
        new THREE.MeshStandardMaterial({
          color: 0xff00aa,
          emissive: 0x880055,
          emissiveIntensity: 0.8,
          roughness: 0.35,
          metalness: 0.2,
        }),
      );
      obstacle.position.set(laneX, 0.625, startZ + 3 + Math.random() * (TILE_LENGTH - 6));
      group.add(obstacle);
      obstacles.push(obstacle);
    }

    this.scene.add(group);
    this.tiles.push({
      group,
      centerZ,
      obstacles,
    });

    this.nextZ += TILE_LENGTH;

    if (this.tiles.length > MAX_TILES) {
      const oldest = this.tiles.shift();
      this.disposeTile(oldest);
    }
  }

  getColliders() {
    return this.tiles.flatMap((tile) => tile.obstacles);
  }

  update(delta, speed) {
    this.speed = speed;
    const distance = this.speed * delta;

    for (const tile of this.tiles) {
      tile.group.position.z -= distance;
    }

    for (let i = this.tiles.length - 1; i >= 0; i -= 1) {
      const tile = this.tiles[i];
      const worldCenter = tile.group.position.z + tile.centerZ;
      if (worldCenter + TILE_LENGTH / 2 < -12) {
        this.disposeTile(tile);
        this.tiles.splice(i, 1);
      }
    }

    const last = this.tiles[this.tiles.length - 1];
    const lastWorldEnd = last.group.position.z + last.centerZ + TILE_LENGTH / 2;
    if (lastWorldEnd < 90) {
      this.addTile();
    }
  }

  disposeTile(tile) {
    tile.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(tile.group);
  }
}
