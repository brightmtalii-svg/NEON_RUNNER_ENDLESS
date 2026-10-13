import * as THREE from 'three';

export function worldBoxFromObject(object, target = new THREE.Box3()) {
  object.updateMatrixWorld(true);
  target.setFromObject(object);
  return target;
}

export function boxesOverlap(a, b) {
  return a.intersectsBox(b);
}

export function createPlayerBox(player, target = new THREE.Box3()) {
  worldBoxFromObject(player, target);
  target.expandByScalar(-0.12);
  return target;
}
