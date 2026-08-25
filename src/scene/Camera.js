import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Camera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    const p = CONFIG.camera.position;
    const l = CONFIG.camera.lookAt;
    this.camera.position.set(p.x, p.y, p.z);
    this.camera.lookAt(l.x, l.y, l.z);
    this.basePosition = this.camera.position.clone();
    this.shakeOffset = new THREE.Vector3();

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  applyShake(offset) {
    this.camera.position.copy(this.basePosition).add(offset);
  }

  resetShake() {
    this.camera.position.copy(this.basePosition);
  }
}
