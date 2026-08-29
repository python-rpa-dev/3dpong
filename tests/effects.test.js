import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Effects } from '../src/scene/Effects.js';

describe('screen flash', () => {
  function setup() {
    const scene = new THREE.Scene();
    const inner = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
    inner.position.set(10, 27, -21);
    scene.add(inner);
    const effects = new Effects(scene, { camera: inner });
    return { scene, inner, effects };
  }

  it('attaches the flash plane to the camera, not the world', () => {
    const { inner, effects } = setup();
    expect(effects.flashMesh.parent).toBe(inner);
  });

  it('shows and hides around a score flash', () => {
    const { effects } = setup();
    expect(effects.flashMesh.visible).toBe(false);
    effects.triggerScreenFlash(0xff0044, 0.3);
    expect(effects.flashMesh.visible).toBe(true);
    for (let i = 0; i < 30; i++) effects.update(1 / 60);
    expect(effects.flashMesh.visible).toBe(false);
  });
});
