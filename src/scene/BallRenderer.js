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

    // Extra ball views (multi-ball): simple sphere + light, no trail
    this.extraViews = [];
    for (let i = 0; i < 2; i++) {
      const extraGeo = new THREE.SphereGeometry(CONFIG.ball.radius, 24, 24);
      const extraMat = new THREE.MeshStandardMaterial({
        color: CONFIG.colors.ball,
        emissive: CONFIG.colors.ball,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.1,
      });
      const extraMesh = new THREE.Mesh(extraGeo, extraMat);
      extraMesh.visible = false;
      scene.add(extraMesh);
      const extraLight = new THREE.PointLight(CONFIG.colors.ball, 0.8, 4);
      scene.add(extraLight);
      this.extraViews.push({ mesh: extraMesh, light: extraLight });
    }
  }

  update(balls) {
    if (!Array.isArray(balls)) balls = [balls];
    const primary = balls[0];

    for (let i = 1; i < this.extraViews.length + 1; i++) {
      const view = this.extraViews[i - 1];
      const ball = balls[i];
      if (!ball || !ball.active) {
        view.mesh.visible = false;
        view.light.intensity = 0;
        continue;
      }
      view.mesh.visible = true;
      view.mesh.position.set(ball.x, ball.radius, ball.z);
      view.light.position.set(ball.x, ball.radius + 0.5, ball.z);
      view.light.intensity = 1;
    }

    const ball = primary;
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

    // Color shifts with speed: yellow → orange → red → white
    const speedRatio = Math.min(ball.currentSpeed / CONFIG.ball.maxSpeed, 1);
    const r = 1;
    const g = 1 - speedRatio * 0.6;
    const b = 1 - speedRatio * 0.9;
    const color = new THREE.Color(r, g, b);
    this.mesh.material.color.copy(color);
    this.mesh.material.emissive.copy(color);
    this.mesh.material.emissiveIntensity = 0.3 + speedRatio * 0.7;
    this.light.color.copy(color);
    this.light.intensity = 0.8 + speedRatio * 1.2;

    // Trail intensity scales with speed
    const trailOpacity = 0.15 + speedRatio * 0.35;
    for (let i = 0; i < this.trailLength; i++) {
      this.trailMeshes[i].material.color.copy(color);
      this.trailMeshes[i].material.opacity = trailOpacity * (1 - i / this.trailLength);
    }

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
