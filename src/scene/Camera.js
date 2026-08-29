import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { poseFor, VIEW_LIMITS } from './cameraPose.js';

export class Camera {
  constructor() {
    const { fov, near, far, position, lookAt } = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      near,
      far
    );
    this.basePose = { position, lookAt };
    this.targetView = { yaw: 0, tilt: 0 };
    this.currentView = { yaw: 0, tilt: 0 };
    this.basePosition = new THREE.Vector3(position.x, position.y, position.z);
    this.baseTarget = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
    this.shakeOffset = { x: 0, y: 0 };
    this.baseFov = fov;
    this.punchAmount = 0;
    // Player's perspective: behind and above the player's paddle, looking down the court
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.baseTarget);
  }

  /** Quick FOV punch-in on big moments (amount ~0.05-0.1). */
  punch(amount) {
    this.punchAmount = Math.max(this.punchAmount, amount);
  }

  /** Set view angle targets in degrees (any yaw; sliders use -45..45) and tilt (-0.6..1). */
  setView(yaw, tilt) {
    this.targetView = { yaw, tilt: Math.max(VIEW_LIMITS.tiltMin, Math.min(VIEW_LIMITS.tiltMax, tilt)) };
  }

  applyShake(offset) {
    this.shakeOffset = offset || { x: 0, y: 0 };
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

  update(dt = 1 / 60) {
    let dirty = false;
    const k = 1 - Math.exp(-dt * 6);
    for (const axis of ['yaw', 'tilt']) {
      const diff = this.targetView[axis] - this.currentView[axis];
      if (Math.abs(diff) > 0.001) {
        this.currentView[axis] += diff * k;
        dirty = true;
      } else if (this.currentView[axis] !== this.targetView[axis]) {
        this.currentView[axis] = this.targetView[axis];
        dirty = true;
      }
    }
    if (dirty) {
      const pose = poseFor(this.basePose.position, this.basePose.lookAt, this.currentView.yaw, this.currentView.tilt);
      this.basePosition.set(pose.position.x, pose.position.y, pose.position.z);
      this.baseTarget.set(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z);
    }
    this.camera.position.set(
      this.basePosition.x + this.shakeOffset.x,
      this.basePosition.y + this.shakeOffset.y,
      this.basePosition.z
    );
    this.camera.lookAt(this.baseTarget);

    if (this.punchAmount > 0.001) {
      this.punchAmount *= Math.exp(-dt * 8);
      this.camera.fov = this.baseFov * (1 - this.punchAmount);
      this.camera.updateProjectionMatrix();
    } else if (this.camera.fov !== this.baseFov) {
      this.punchAmount = 0;
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
