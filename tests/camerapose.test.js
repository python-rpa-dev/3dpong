import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { poseFor, clampView, effectiveYaw, VIEW_LIMITS } from '../src/scene/cameraPose.js';
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
      .toBeGreaterThan(base.position.y + 8);
    expect(poseFor(base.position, base.lookAt, 0, -1).position.y)
      .toBeLessThan(base.position.y);
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

  describe('all court corners stay in frame', () => {
    const corners = [];
    for (const x of [-10, 10]) for (const z of [-15, 15]) { corners.push([x, 0, z]); corners.push([x, 2, z]); }

    function worstMargin(yaw, tilt, aspect, fovScale) {
      const p = poseFor(base.position, base.lookAt, yaw, tilt);
      const cam = new THREE.PerspectiveCamera(base.fov * fovScale, aspect, 0.1, 100);
      cam.position.set(p.position.x, p.position.y, p.position.z);
      cam.lookAt(p.lookAt.x, p.lookAt.y, p.lookAt.z);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      let w = Infinity;
      for (const c of corners) {
        const v = new THREE.Vector3(...c).project(cam);
        w = Math.min(w, 1 - Math.abs(v.x), 1 - Math.abs(v.y));
      }
      return w;
    }

    it('across allowed yaw/tilt, aspect ratios and the FOV punch', () => {
      const yaws = [-45, -30, -15, 0, 15, 30, 45];
      const tilts = [VIEW_LIMITS.tiltMin, -0.3, 0, 0.5, VIEW_LIMITS.tiltMax];
      const aspects = [4 / 3, 16 / 9, 21 / 9];
      for (const yawBase of yaws) {
        for (const swap of [false, true]) {
          const yaw = effectiveYaw(yawBase, swap);
          for (const tilt of tilts) {
            for (const aspect of aspects) {
              for (const fovScale of [1, 0.94]) {
                expect(worstMargin(yaw, tilt, aspect, fovScale), `yaw=${yaw} tilt=${tilt} a=${aspect.toFixed(2)} fs=${fovScale}`).toBeGreaterThan(0);
              }
            }
          }
        }
      }
    });
  });
});
