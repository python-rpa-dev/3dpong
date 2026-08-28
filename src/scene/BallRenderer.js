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
      transparent: true,
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
      this.extraViews.push({ mesh: extraMesh, light: extraLight, shadow: this.createShadow(scene) });
    }

    // Ground shadow for primary ball
    this.shadow = this.createShadow(scene);

    // Squash & stretch state
    this.squash = 0;
    this.squashAxis = 'z';
  }

  createShadow(scene) {
    const geo = new THREE.CircleGeometry(CONFIG.ball.radius * 1.4, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  /**
   * Trigger a squash deformation on bounce.
   * @param {'x'|'z'} axis - collision normal axis
   */
  triggerSquash(axis) {
    this.squash = 1;
    this.squashAxis = axis;
  }

  /** Fade the ball out while a ghost powerup hides it from the opponent. */
  setGhost(hidden) {
    this.ghostHidden = !!hidden;
  }

  update(balls, dt = 1 / 60, combo = 0) {
    if (!Array.isArray(balls)) balls = [balls];
    const primary = balls[0];

    // Decay squash & stretch
    this.squash = Math.max(0, this.squash - dt * 6);
    const s = this.squash;
    const axisZ = this.squashAxis === 'z';

    for (let i = 1; i < this.extraViews.length + 1; i++) {
      const view = this.extraViews[i - 1];
      const ball = balls[i];
      if (!ball || !ball.active) {
        view.mesh.visible = false;
        view.light.intensity = 0;
        view.shadow.visible = false;
        continue;
      }
      view.mesh.visible = true;
      view.mesh.position.set(ball.x, ball.radius, ball.z);
      view.light.position.set(ball.x, ball.radius + 0.5, ball.z);
      view.light.intensity = 1;
      view.shadow.visible = true;
      view.shadow.position.set(ball.x, 0.02, ball.z);
    }

    const ball = primary;
    const y = ball.radius;
    this.mesh.position.set(ball.x, y, ball.z);
    this.light.position.set(ball.x, y + 0.5, ball.z);

    // Squash on impact: flatten along collision normal, bulge perpendicular
    const flat = 1 - s * 0.4;
    const bulge = 1 + s * 0.25;
    this.mesh.scale.set(
      axisZ ? bulge : flat,
      bulge,
      axisZ ? flat : bulge
    );

    if (!ball.active) {
      this.mesh.visible = false;
      this.light.intensity = 0;
      this.shadow.visible = false;
      this.trailPositions = [];
      this.trailMeshes.forEach(m => m.visible = false);
      return;
    }

    this.mesh.visible = true;

    // Ground shadow tracks the ball, swells slightly during squash
    this.shadow.visible = true;
    this.shadow.position.set(ball.x, 0.02, ball.z);
    const shadowScale = 1 + s * 0.35;
    this.shadow.scale.set(shadowScale, shadowScale, 1);

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

    // Trail intensity scales with speed; hue walks the combo palette
    this.ghostFade = (this.ghostFade || 0) + ((this.ghostHidden ? 1 : 0) - (this.ghostFade || 0)) * Math.min(1, dt * 8);
    const ghostMul = 1 - this.ghostFade * 0.85;
    const palette = CONFIG.comboColors;
    const comboColor = new THREE.Color(palette[Math.min(Math.floor(combo / 3), palette.length - 1)]);
    const trailMix = Math.min(combo / 12, 0.75);
    const trailColor = color.clone().lerp(comboColor, trailMix);
    const trailOpacity = (0.15 + speedRatio * 0.35 + Math.min(combo * 0.01, 0.15)) * ghostMul;
    for (let i = 0; i < this.trailLength; i++) {
      this.trailMeshes[i].material.color.copy(trailColor);
      this.trailMeshes[i].material.opacity = trailOpacity * (1 - i / this.trailLength);
    }
    this.mesh.material.opacity = Math.max(0.12, ghostMul);
    this.light.intensity *= ghostMul;

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
    this.squash = 0;
    this.trailMeshes.forEach(m => m.visible = false);
    if (this.shadow) this.shadow.visible = false;
    this.extraViews.forEach(v => { v.mesh.visible = false; v.shadow.visible = false; });
  }
}
