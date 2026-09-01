import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class PowerupRenderer {
  constructor(scene) {
    this.time = 0;
    this.meshes = [];
    const geo = new THREE.TorusGeometry(0.6, 0.15, 12, 24);
    for (let i = 0; i < CONFIG.powerups.maxActive; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.meshes.push(mesh);
    }

    // Echo paddle zones: one translucent bar per side, pulsing on the goal line
    const echoGeo = new THREE.BoxGeometry(1, 1.4, 0.5);
    this.echoMeshes = [];
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: CONFIG.powerups.colors.echo,
        emissive: CONFIG.powerups.colors.echo,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.35,
      });
      const mesh = new THREE.Mesh(echoGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.echoMeshes.push(mesh);
    }
  }

  /** Show guarded goal-line halves: [{ side:'player'|'ai', x, halfWidth }] */
  setEchoes(list) {
    const lineZ = CONFIG.court.depth / 2 - 0.8;
    for (let i = 0; i < this.echoMeshes.length; i++) {
      const mesh = this.echoMeshes[i];
      const echo = list && list[i];
      if (!echo) {
        mesh.visible = false;
        continue;
      }
      const z = echo.side === 'player' ? -lineZ : lineZ;
      mesh.visible = true;
      mesh.position.set(echo.x, 0.75, z);
      mesh.scale.x = echo.halfWidth * 2;
      mesh.material.opacity = 0.28 + Math.sin(this.time * 6) * 0.1;
    }
  }

  update(activeList, dt) {
    this.time += dt;
    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];
      const pu = activeList && activeList[i];
      if (!pu) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(pu.x, 0.9 + Math.sin(this.time * 3 + i * 2) * 0.15, pu.z);
      mesh.rotation.z = this.time * 2 + i;
      const color = CONFIG.powerups.colors[pu.type] || 0xffffff;
      mesh.material.color.setHex(color);
      mesh.material.emissive.setHex(color);
    }
  }
}
