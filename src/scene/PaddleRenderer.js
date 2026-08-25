import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class PaddleRenderer {
  constructor(scene) {
    this.scene = scene;

    // Player paddle (cyan)
    this.playerMesh = this.createPaddleMesh(CONFIG.colors.playerPaddle);
    scene.add(this.playerMesh);

    // Opponent paddle (magenta)
    this.aiMesh = this.createPaddleMesh(CONFIG.colors.opponentPaddle);
    scene.add(this.aiMesh);
  }

  createPaddleMesh(color) {
    const geo = new THREE.BoxGeometry(
      CONFIG.paddle.width,
      CONFIG.paddle.height,
      CONFIG.paddle.depth
    );
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  update(playerPaddle, aiPaddle) {
    this.playerMesh.position.set(
      playerPaddle.x,
      CONFIG.paddle.height / 2,
      playerPaddle.z
    );
    this.aiMesh.position.set(
      aiPaddle.x,
      CONFIG.paddle.height / 2,
      aiPaddle.z
    );
  }
}
