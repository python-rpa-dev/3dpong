import * as THREE from 'three';
import { CONFIG } from '../config.js';

const _stretch = { rotY: 0, x: 1, z: 1 };

export class BallRenderer {
  constructor(scene) {
    this.trailLength = 10;
    this.trailPositions = [];
    this.lastTrailPos = null;
    this.trailPalette = CONFIG.comboColors;
    // Scratch colors reused per frame to keep the render loop allocation-free
    this._color = new THREE.Color();
    this._comboColor = new THREE.Color();
    this._trailColor = new THREE.Color();

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

  /** Accessibility: swap the combo hue ramp (e.g. colorblind-safe Okabe-Ito). */
  setTrailPalette(palette) {
    if (Array.isArray(palette) && palette.length > 0) this.trailPalette = palette;
  }

  /**
   * Pseudo motion blur: elongate the ball along its travel direction by about
   * one frame of movement. World-space stretch means the screen-space streak
   * scales with perspective automatically — longer near the camera or zoomed,
   * negligible far away — which is exactly where fast depth-wise motion would
   * otherwise strobe between frames.
   */
  _motionStretch(ball, dt) {
    const sp = ball.currentSpeed || 0;
    if (sp < 1e-6 || !ball.vx && !ball.vz) {
      _stretch.rotY = 0; _stretch.x = 1; _stretch.z = 1;
      return _stretch;
    }
    const ratio = Math.min(sp / CONFIG.ball.maxSpeed, 1);
    // Cubic ramp: near-round at normal speeds, streak only when really fast
    const stretch = Math.min(ratio * ratio * ratio * CONFIG.ball.smearGain, CONFIG.ball.smearMax);
    if (stretch < 0.05) {
      _stretch.rotY = 0; _stretch.x = 1; _stretch.z = 1;
      return _stretch;
    }
    // Local +X after a Y-rotation of atan2(-uz, ux) points along the velocity
    _stretch.rotY = Math.atan2(-ball.vz / sp, ball.vx / sp);
    _stretch.x = 1 + stretch;
    _stretch.z = 1;
    return _stretch;
  }

  update(balls, dt = 1 / 60, combo = 0, alpha = 1) {
    if (!Array.isArray(balls)) balls = [balls];
    const primary = balls[0];
    // Render between the last two fixed physics steps for sub-step smoothness
    const ipos = (b) => (alpha >= 1 || b.prevX === undefined || b.prevZ === undefined)
      ? [b.x, b.z]
      : [b.prevX + (b.x - b.prevX) * alpha, b.prevZ + (b.z - b.prevZ) * alpha];
    // Ghost fade must be known before anything (incl. ground shadows) is drawn
    this.ghostFade = (this.ghostFade || 0) + ((this.ghostHidden ? 1 : 0) - (this.ghostFade || 0)) * Math.min(1, dt * 8);
    const ghostMul = 1 - this.ghostFade * 0.85;
    const shadowOpacity = 0.35 * (1 - this.ghostFade * 0.95);

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
      const [ebx, ebz] = ipos(ball);
      const st = this._motionStretch(ball, dt);
      view.mesh.visible = true;
      view.mesh.rotation.y = st.rotY;
      view.mesh.scale.set(st.x, 1, st.z);
      view.mesh.position.set(ebx, ball.radius, ebz);
      view.light.position.set(ebx, ball.radius + 0.5, ebz);
      view.light.intensity = 1;
      view.shadow.visible = true;
      view.shadow.position.set(ebx, 0.02, ebz);
      view.shadow.material.opacity = shadowOpacity;
    }

    const ball = primary;
    const y = ball.radius;
    const [bx, bz] = ipos(ball);
    this.mesh.position.set(bx, y, bz);
    this.light.position.set(bx, y + 0.5, bz);

    // Squash on impact: flatten along collision normal, bulge perpendicular;
    // velocity smear stretches along travel so fast motion reads continuous.
    // Squash factors are projected into the (possibly rotated) stretch frame.
    const st = this._motionStretch(ball, dt);
    const flat = 1 - s * 0.4;
    const bulge = 1 + s * 0.25;
    const sp = ball.currentSpeed || 0;
    const a = sp > 1e-6 ? Math.abs((axisZ ? ball.vz : ball.vx) / sp) : 0;
    this.mesh.rotation.y = st.rotY;
    this.mesh.scale.set(
      (flat * a + bulge * (1 - a)) * st.x,
      bulge,
      (bulge * a + flat * (1 - a)) * st.z
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

    // Ground shadow tracks the ball, swells slightly during squash; fades with ghost
    this.shadow.visible = true;
    this.shadow.material.opacity = shadowOpacity;
    this.shadow.position.set(bx, 0.02, bz);
    const shadowScale = 1 + s * 0.35;
    this.shadow.scale.set(shadowScale, shadowScale, 1);

    // Color shifts with speed: yellow → orange → red → white
    const speedRatio = Math.min(ball.currentSpeed / CONFIG.ball.maxSpeed, 1);
    const r = 1;
    const g = 1 - speedRatio * 0.6;
    const b = 1 - speedRatio * 0.9;
    const color = this._color.setRGB(r, g, b);
    this.mesh.material.color.copy(color);
    this.mesh.material.emissive.copy(color);
    this.mesh.material.emissiveIntensity = 0.3 + speedRatio * 0.7;
    this.light.color.copy(color);
    this.light.intensity = 0.8 + speedRatio * 1.2;

    // Trail intensity scales with speed; hue walks the combo palette
    const palette = this.trailPalette;
    const comboColor = this._comboColor.set(palette[Math.min(Math.floor(combo / 3), palette.length - 1)]);
    const trailMix = Math.min(combo / 12, 0.75);
    const trailColor = this._trailColor.copy(color).lerp(comboColor, trailMix);
    const trailOpacity = (0.15 + speedRatio * 0.35 + Math.min(combo * 0.01, 0.15)) * ghostMul;
    for (let i = 0; i < this.trailLength; i++) {
      this.trailMeshes[i].material.color.copy(trailColor);
      this.trailMeshes[i].material.opacity = trailOpacity * (1 - i / this.trailLength);
    }
    this.mesh.material.opacity = Math.max(0.12, ghostMul);
    this.light.intensity *= ghostMul;

    // Update trail (distance-based; threshold tracks per-frame travel so the
    // tail advances continuously instead of popping at a fixed spacing)
    const sampleDist = Math.max(0.15, (ball.currentSpeed || 0) * dt);
    const dist = this.lastTrailPos
      ? Math.hypot(bx - this.lastTrailPos.x, bz - this.lastTrailPos.z)
      : 1;

    if (dist > sampleDist) {
      this.trailPositions.unshift({ x: bx, z: bz });
      this.lastTrailPos = { x: bx, z: bz };
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
