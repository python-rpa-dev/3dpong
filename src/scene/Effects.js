import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.particles = [];
    this.shakeOffset = new THREE.Vector3();
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;

    // Screen flash — parented to the camera so it can never peek into the
    // frustum from the side at any view pose (world-space planes used to flicker in corners)
    this.flashMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      })
    );
    this.flashMesh.renderOrder = 999;
    this.flashMesh.frustumCulled = false;
    this.flashMesh.visible = false;
    const cam = camera && (camera.isObject3D ? camera : camera.camera);
    if (cam) {
      scene.add(cam);
      this.flashMesh.position.set(0, 0, -5);
      cam.add(this.flashMesh);
    } else {
      this.flashMesh.position.z = -50;
      scene.add(this.flashMesh);
    }
    this.flashTime = 0;
    this.flashDuration = 0;

    // Combo rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 32);
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, life: 0, maxLife: 0 });
    }

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

  triggerShake(magnitude, duration) {
    this.shakeMagnitude = magnitude;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  }

  triggerScreenFlash(color, duration) {
    this.flashMesh.material.color.setHex(color);
    this.flashMesh.material.opacity = 0.4;
    this.flashMesh.visible = true;
    this.flashTime = duration;
    this.flashDuration = duration;
  }

  spawnComboRing(x, y, z, combo) {
    const ring = this.rings.find(r => r.life <= 0);
    if (!ring) return;
    ring.mesh.position.set(x, y, z);
    ring.mesh.rotation.set(0, 0, 0);
    const color = CONFIG.comboColors[Math.min(combo - 1, CONFIG.comboColors.length - 1)] || 0xffffff;
    ring.mesh.material.color.setHex(color);
    ring.mesh.material.opacity = 1;
    ring.mesh.scale.set(1, 1, 1);
    ring.mesh.visible = true;
    ring.life = 0.6;
    ring.maxLife = 0.6;
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

  spawnParticles(x, y, z, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const p = this.findParticle();
      if (!p) break;
      p.mesh.position.set(x, y, z);
      p.vx = (Math.random() - 0.5) * speed * 2;
      p.vy = Math.random() * speed + 1;
      p.vz = (Math.random() - 0.5) * speed * 2;
      p.life = 0.4;
      p.maxLife = 0.4;
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.visible = true;
    }
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

    // Update screen flash
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      const t = Math.max(0, this.flashTime / this.flashDuration);
      this.flashMesh.material.opacity = 0.4 * t;
      if (this.flashTime <= 0) {
        this.flashMesh.visible = false;
      }
    }

    // Update combo rings
    for (const ring of this.rings) {
      if (ring.life > 0) {
        ring.life -= dt;
        const t = Math.max(0, ring.life / ring.maxLife);
        ring.mesh.material.opacity = t;
        const scale = 1 + (1 - t) * 3;
        ring.mesh.scale.set(scale, scale, scale);
        if (ring.life <= 0) {
          ring.mesh.visible = false;
        }
      }
    }
  }

  clear() {
    for (const p of this.particles) {
      p.life = 0;
      p.mesh.visible = false;
    }
    for (const ring of this.rings) {
      ring.life = 0;
      ring.mesh.visible = false;
    }
    this.flashTime = 0;
    this.flashMesh.visible = false;
    this.shakeTime = 0;
    this.shakeOffset.set(0, 0, 0);
  }
}
