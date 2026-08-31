import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BallRenderer } from '../src/scene/BallRenderer.js';

function makeBall() {
  return { x: 1, z: 2, radius: 0.5, vx: 4, vz: 9, active: true };
}

describe('ghost hides the ground shadow', () => {
  it('fades the primary shadow while the ball is hidden', () => {
    const renderer = new BallRenderer(new THREE.Scene());
    const ball = makeBall();
    for (let i = 0; i < 30; i++) renderer.update(ball, 1 / 60);
    expect(renderer.shadow.material.opacity).toBeCloseTo(0.35, 1);

    renderer.setGhost(true);
    for (let i = 0; i < 90; i++) renderer.update(ball, 1 / 60);
    expect(renderer.shadow.material.opacity).toBeLessThan(0.02);

    renderer.setGhost(false);
    for (let i = 0; i < 90; i++) renderer.update(ball, 1 / 60);
    expect(renderer.shadow.material.opacity).toBeGreaterThan(0.3);
  });

  it('fades extra ball shadows with the same ghost state', () => {
    const renderer = new BallRenderer(new THREE.Scene());
    const balls = [makeBall(), makeBall()];
    renderer.setGhost(true);
    for (let i = 0; i < 90; i++) renderer.update(balls, 1 / 60);
    expect(renderer.extraViews[0].shadow.material.opacity).toBeLessThan(0.02);
  });
});
