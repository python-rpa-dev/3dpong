import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Camera {
  constructor() {
    const { fov, near, far, position, lookAt } = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      near,
      far
    );
    // Player's perspective: behind and above the player's paddle, looking down the court
    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    this.basePosition = new THREE.Vector3(position.x, position.y, position.z);
    this.baseTarget = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
  }

  applyShake(offset) {
    if (offset && (offset.x !== 0 || offset.y !== 0)) {
      this.camera.position.x = this.basePosition.x + offset.x;
      this.camera.position.y = this.basePosition.y + offset.y;
      this.camera.position.z = this.basePosition.z;
    } else {
      this.camera.position.copy(this.basePosition);
    }
  }

  update() {
    // Reserved for future camera animation
  }
}
