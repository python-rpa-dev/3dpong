import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class AimIndicator {
  constructor(scene) {
    this.dots = [];
    const geo = new THREE.SphereGeometry(0.18, 10, 10);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.playerPaddle,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.dots.push(mesh);
    }
    this.time = 0;
  }

  /**
   * @param {boolean} visible - show during SERVE state
   * @param {number} aimX - normalized aim -1..1
   * @param {number} serveDirection - 1 (toward AI) or -1 (toward player)
   */
  update(visible, aimX, serveDirection, dt = 1 / 60) {
    this.time += dt;
    if (!visible) {
      for (const d of this.dots) d.visible = false;
      return;
    }
    const angle = aimX * CONFIG.serve.maxAimAngle;
    const dirX = Math.sin(angle);
    const dirZ = Math.cos(angle) * serveDirection;
    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];
      const dist = 2 + i * 1.1;
      const pulse = 0.45 + 0.3 * Math.sin(this.time * 6 - i * 0.7);
      dot.visible = true;
      dot.position.set(dirX * dist, 0.15, dirZ * dist);
      dot.material.opacity = pulse * (1 - i / this.dots.length);
    }
  }
}
