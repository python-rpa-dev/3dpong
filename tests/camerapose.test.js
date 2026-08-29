import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { poseFor, clampView, effectiveYaw, VIEW_LIMITS, minFovToContain, MIN_ZOOM_REDUCTION } from '../src/scene/cameraPose.js';
import { CONFIG } from '../src/config.js';

const base = CONFIG.camera;

describe('cameraPose', () => {
  it('default view reproduces the base pose exactly', () => {
    const p = poseFor(base.position, base.lookAt, 0, 0);
    expect(p.position.x).toBeCloseTo(base.position.x, 10);
    expect(p.position.y).toBeCloseTo(base.position.y, 10);
    expect(p.position.z).toBeCloseTo(base.position.z, 10);
    expect(p.lookAt).toEqual(base.lookAt);
  });

  it('side swap mirrors the rig through the court center', () => {
    const p = poseFor(base.position, base.lookAt, 180, 0);
    expect(p.position.x).toBeCloseTo(-base.position.x, 10);
    expect(p.position.z).toBeCloseTo(-base.position.z, 10);
    expect(p.lookAt.z).toBeCloseTo(-base.lookAt.z, 10);
  });

  it('tilt raises and lowers the camera', () => {
    expect(poseFor(base.position, base.lookAt, 0, 1).position.y)
      .toBeGreaterThan(base.position.y + 5);
    expect(poseFor(base.position, base.lookAt, 0, -1).position.y)
      .toBeLessThan(base.position.y - 5);
  });

  it('clampView bounds both axes', () => {
    const c = clampView(-999, 999);
    expect(c.yaw).toBe(-VIEW_LIMITS.yawMax);
    expect(c.tilt).toBe(VIEW_LIMITS.tiltMax);
  });

  it('effectiveYaw adds the half turn when swapped', () => {
    expect(effectiveYaw(30, false)).toBe(30);
    expect(effectiveYaw(30, true)).toBe(210);
  });

  describe('minFovToContain', () => {
    it('returns the base fov when content already fills the frame', () => {
      expect(minFovToContain(60, 1)).toBeCloseTo(60, 6);
      expect(minFovToContain(60, 0.4)).toBeLessThan(60); // room to zoom
    });

    it('shrinks monotonically with extent', () => {
      const a = minFovToContain(60, 0.9);
      const b = minFovToContain(60, 0.7);
      expect(b).toBeLessThan(a);
      expect(b).toBeGreaterThan(MIN_ZOOM_REDUCTION * 40); // stays sane
    });

    it('clamped fov actually contains the court (verified by projection)', () => {
      const p = poseFor(base.position, base.lookAt, 180, VIEW_LIMITS.tiltMin);
      const cam = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 100);
      cam.position.set(p.position.x, p.position.y, p.position.z);
      cam.lookAt(p.lookAt.x, p.lookAt.y, p.lookAt.z);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      let e = 0;
      for (const x of [-10, 10]) for (const z of [-15, 15]) {
        for (const y of [0, 2]) {
          const v = new THREE.Vector3(x, y, z).project(cam);
          e = Math.max(e, Math.abs(v.x), Math.abs(v.y));
        }
      }
      const cam2 = new THREE.PerspectiveCamera(minFovToContain(60, e) * 1.001, 4 / 3, 0.1, 100);
      cam2.position.copy(cam.position);
      cam2.quaternion.copy(cam.quaternion);
      cam2.updateMatrixWorld();
      cam2.updateProjectionMatrix();
      for (const x of [-10, 10]) for (const z of [-15, 15]) {
        for (const y of [0, 2]) {
          const v = new THREE.Vector3(x, y, z).project(cam2);
          expect(Math.abs(v.x)).toBeLessThanOrEqual(1.001);
          expect(Math.abs(v.y)).toBeLessThanOrEqual(1.001);
        }
      }
    });
  });

  describe('court containment at every allowed pose', () => {
    const corners = [];
    for (const x of [-10, 10]) for (const z of [-15, 15]) { corners.push([x, 0, z]); corners.push([x, 2, z]); }

    function requiredFov(yaw, tilt, aspect) {
      const p = poseFor(base.position, base.lookAt, yaw, tilt);
      const cam = new THREE.PerspectiveCamera(base.fov, aspect, 0.1, 100);
      cam.position.set(p.position.x, p.position.y, p.position.z);
      cam.lookAt(p.lookAt.x, p.lookAt.y, p.lookAt.z);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      let e = 0;
      for (const c of corners) {
        const local = cam.worldToLocal(new THREE.Vector3(...c));
        expect(local.z, `corner ${c} behind camera at yaw=${yaw} tilt=${tilt}`).toBeLessThan(-0.1);
        const v = new THREE.Vector3(...c).project(cam);
        e = Math.max(e, Math.abs(v.x), Math.abs(v.y));
      }
      return minFovToContain(base.fov, e);
    }

    it('all corners stay in front and fit within the base fov', () => {
      for (const yawBase of [-45, -30, -15, 0, 15, 30, 45]) {
        for (const swap of [false, true]) {
          const yaw = effectiveYaw(yawBase, swap);
          for (const tilt of [VIEW_LIMITS.tiltMin, -0.5, 0, 0.5, VIEW_LIMITS.tiltMax]) {
            for (const aspect of [4 / 3, 16 / 9, 21 / 9]) {
              expect(requiredFov(yaw, tilt, aspect), `yaw=${yaw} tilt=${tilt} a=${aspect.toFixed(2)}`)
                .toBeLessThanOrEqual(base.fov + 0.01);
            }
          }
        }
      }
    });

    it('full tilt is a real elevation change, not a zoom-out', () => {
      const up = poseFor(base.position, base.lookAt, 0, VIEW_LIMITS.tiltMax).position;
      const down = poseFor(base.position, base.lookAt, 0, VIEW_LIMITS.tiltMin).position;
      const d0 = Math.hypot(base.position.x, base.position.y, base.position.z + 3);
      expect(Math.hypot(up.x, up.y, up.z + 3)).toBeCloseTo(d0, 6); // constant distance
      expect(down.y).toBeLessThan(base.position.y - 5);
      expect(up.y).toBeGreaterThan(base.position.y + 5);
    });
  });
});
