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
