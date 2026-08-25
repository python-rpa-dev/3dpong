import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class BallRenderer {
  constructor(scene) {
    this.trailLength = 10;
    this.trailPositions = [];
    this.lastTrailPos = null;

    // Ball mesh
    const geo = new THREE.SphereGeometry(CONFIG.ball.radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.ball,
      emissive: CONFIG.colors.ball,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    scene.add(this.mesh);

    // Point light
    this.light = new THREE.PointLight(CONFIG.colors.ball, 1, 5);
    scene.add(this.light);

    // Trail
    this.trailMeshes = [];
    for (let i = 0; i < this.trailLength; i++) {
      const size = CONFIG.ball.radius * (1 - i / this.trailLength) * 0.4;
      const trailGeo = new THREE.SphereGeometry(Math.max(size, 0.05), 8, 8);
      const trailMat = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.ball,
        transparent: true,
        opacity: 0.25 * (1 - i / this.trailLength),
      });
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      trailMesh.visible = false;
      scene.add(trailMesh);
      this.trailMeshes.push(trailMesh);
    }
  }

  update(ball) {
    const y = ball.radius;
    this.mesh.position.set(ball.x, y, ball.z);
    this.light.position.set(ball.x, y + 0.5, ball.z);

    if (!ball.active) {
      this.mesh.visible = false;
      this.light.intensity = 0;
      this.trailPositions = [];
      this.trailMeshes.forEach(m => m.visible = false);
      return;
    }

    this.mesh.visible = true;
    this.light.intensity = 1;

    // Update trail (distance-based)
    const dist = this.lastTrailPos
      ? Math.hypot(ball.x - this.lastTrailPos.x, ball.z - this.lastTrailPos.z)
      : 1;

    if (dist > 0.3) {
      this.trailPositions.unshift({ x: ball.x, z: ball.z });
      this.lastTrailPos = { x: ball.x, z: ball.z };
      if (this.trailPositions.length > this.trailLength) {
        this.trailPositions.pop();
      }
    }

    for (let i = 0; i < this.trailLength; i++) {
      if (i < this.trailPositions.length) {
        this.trailMeshes[i].visible = true;
        this.trailMeshes[i].position.set(
          this.trailPositions[i].x,
          y,
          this.trailPositions[i].z
        );
      } else {
        this.trailMeshes[i].visible = false;
      }
    }
  }

  reset() {
    this.trailPositions = [];
    this.lastTrailPos = null;
    this.trailMeshes.forEach(m => m.visible = false);
  }
}
