import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shakeOffset = new THREE.Vector3();
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;

    // Pre-create particle pool
    const particleGeo = new THREE.SphereGeometry(0.08, 4, 4);
    for (let i = 0; i < 100; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(particleGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0,
      });
    }
  }

  spawnHit(x, z, color) {
    const count = CONFIG.effects.hitParticles;
    for (let i = 0; i < count; i++) {
      const p = this.findParticle();
      if (!p) break;
      p.mesh.position.set(x, CONFIG.ball.radius, z);
      p.vx = (Math.random() - 0.5) * 6;
      p.vy = Math.random() * 4 + 1;
      p.vz = (Math.random() - 0.5) * 6;
      p.life = 0.3;
      p.maxLife = 0.3;
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.visible = true;
    }
  }

  spawnScore(x, z, color) {
    const count = CONFIG.effects.scoreParticles;
    for (let i = 0; i < count; i++) {
      const p = this.findParticle();
      if (!p) break;
      p.mesh.position.set(x, CONFIG.ball.radius, z);
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = Math.random() * 6 + 2;
      p.vz = (Math.random() - 0.5) * 10;
      p.life = 0.5;
      p.maxLife = 0.5;
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.visible = true;
    }
  }

  triggerShake(magnitude, duration) {
    this.shakeMagnitude = magnitude;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  }

  findParticle() {
    return this.particles.find(p => p.life <= 0) || null;
  }

  update(dt) {
    // Update particles
    for (const p of this.particles) {
      if (p.life > 0) {
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 10 * dt; // gravity
        p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) {
          p.mesh.visible = false;
        }
      }
    }

    // Update screen shake
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const t = Math.max(0, this.shakeTime / this.shakeDuration);
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeMagnitude * t,
        (Math.random() - 0.5) * this.shakeMagnitude * t,
        0
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
  }

  clear() {
    for (const p of this.particles) {
      p.life = 0;
      p.mesh.visible = false;
    }
    this.shakeTime = 0;
    this.shakeOffset.set(0, 0, 0);
  }
}
