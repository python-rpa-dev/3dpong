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

  /**
   * Convert a screen point to the world x where the view ray crosses z = planeZ.
   */
  screenToWorldX(clientX, clientY, width, height, planeZ) {
    const ndcX = (clientX / width) * 2 - 1;
    const ndcY = -(clientY / height) * 2 + 1;
    const point = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
    const dir = point.sub(this.camera.position);
    if (Math.abs(dir.z) < 1e-6) return 0;
    const t = (planeZ - this.camera.position.z) / dir.z;
    if (t <= 0) return 0;
    return this.camera.position.x + dir.x * t;
  }

  update() {
    // Reserved for future camera animation
  }
}
