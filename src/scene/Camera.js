import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { poseFor, VIEW_LIMITS, MIN_ZOOM_REDUCTION, minFovToContain } from './cameraPose.js';

const COURT_CORNERS = [];
const _corner = new THREE.Vector3();
for (const x of [-CONFIG.court.width / 2, CONFIG.court.width / 2]) {
  for (const z of [-CONFIG.court.depth / 2, CONFIG.court.depth / 2]) {
    COURT_CORNERS.push([x, 0, z], [x, CONFIG.court.wallHeight, z]);
  }
}

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
    // Slider-only yaw (excludes the side-swap half turn); steering unprojects
    // against this so orbiting never degenerates the ray/plane intersection.
    this.targetSliderYaw = 0;
    this.currentSliderYaw = 0;
    this.basePosition = new THREE.Vector3(position.x, position.y, position.z);
    this.baseTarget = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
    this.shakeOffset = { x: 0, y: 0 };
    this.baseFov = fov;
    this.punchAmount = 0;
    this.zoom = 0;
    // Player's perspective: behind and above the player's paddle, looking down the court
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.baseTarget);
  }

  /** Quick FOV punch-in on big moments (amount ~0.05-0.1). */
  punch(amount) {
    this.punchAmount = Math.max(this.punchAmount, amount);
  }

  /** Set view angle targets in degrees (any yaw; sliders use -45..45) and tilt (-0.6..1). */
  setView(yaw, tilt, sliderYaw = yaw) {
    this.targetView = { yaw, tilt: Math.max(VIEW_LIMITS.tiltMin, Math.min(VIEW_LIMITS.tiltMax, tilt)) };
    this.targetSliderYaw = sliderYaw;
  }

  /** Zoom in 0..1 (FOV reduction, clamped so the court never gets cut off). */
  setZoom(zoom) {
    this.zoom = Math.max(0, Math.min(1, zoom));
  }

  applyShake(offset) {
    this.shakeOffset = offset || { x: 0, y: 0 };
  }

  /**
   * Convert a screen point to the world x where the view ray crosses z = planeZ.
   * The slider yaw is rotated back out of the ray first: with the orbit undone,
   * the camera always faces the paddle plane head-on (or from behind when sides
   * are swapped), so edge rays never graze backward and steering stays usable
   * at any view angle. At slider yaw 0 this is exactly the plain intersection.
   */
  screenToWorldX(clientX, clientY, width, height, planeZ) {
    const ndcX = (clientX / width) * 2 - 1;
    const ndcY = -(clientY / height) * 2 + 1;
    const point = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
    const dir = point.sub(this.camera.position);
    // Undo the slider orbit (transpose of poseFor's rotation) about court center
    const rad = (this.currentSliderYaw * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const ox = this.camera.position.x * cos + this.camera.position.z * sin;
    const oz = -this.camera.position.x * sin + this.camera.position.z * cos;
    const dx = dir.x * cos + dir.z * sin;
    const dz = -dir.x * sin + dir.z * cos;
    if (Math.abs(dz) < 1e-6) return 0;
    const t = (planeZ - oz) / dz;
    if (t <= 0) return 0;
    return ox + dx * t;
  }

  update(dt = 1 / 60) {
    let dirty = false;
    const k = 1 - Math.exp(-dt * 6);
    this.currentSliderYaw += (this.targetSliderYaw - this.currentSliderYaw) * k;
    if (Math.abs(this.targetSliderYaw - this.currentSliderYaw) < 0.001) this.currentSliderYaw = this.targetSliderYaw;
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

    if (this.punchAmount > 0.001) this.punchAmount *= Math.exp(-dt * 8);
    else this.punchAmount = 0;

    const desired = this.baseFov * (1 - MIN_ZOOM_REDUCTION * this.zoom) * (1 - this.punchAmount);
    let fov = Math.min(this.baseFov, desired);
    if (fov < this.baseFov - 1e-4) {
      // Measure court extent at base fov, then clamp zoom+punch to the no-clip limit.
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();
      let e = 0;
      for (const c of COURT_CORNERS) {
        const v = _corner.set(c[0], c[1], c[2]).project(this.camera);
        e = Math.max(e, Math.abs(v.x), Math.abs(v.y));
      }
      fov = Math.max(fov, minFovToContain(this.baseFov, e));
    }
    if (fov !== this.camera.fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
