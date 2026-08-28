import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class PaddleRenderer {
  constructor(scene) {
    this.scene = scene;
    this.playerFlash = 0;
    this.aiFlash = 0;

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

  flashPlayer() {
    this.playerFlash = 1.0;
  }

  flashAI() {
    this.aiFlash = 1.0;
  }

  update(playerPaddle, aiPaddle, dt) {
    if (!dt || dt <= 0) dt = 1 / 60;
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

    // Width scaling from powerup effects
    const pw = (playerPaddle.width || CONFIG.paddle.width) / CONFIG.paddle.width;
    const aw = (aiPaddle.width || CONFIG.paddle.width) / CONFIG.paddle.width;
    this.playerMesh.scale.set(pw, 1, 1);
    this.aiMesh.scale.set(aw, 1, 1);

    // Flash decay
    if (this.playerFlash > 0) {
      this.playerFlash = Math.max(0, this.playerFlash - dt * 10);
      this.playerMesh.material.emissiveIntensity = 0.4 + this.playerFlash * 0.8;
    }
    if (this.aiFlash > 0) {
      this.aiFlash = Math.max(0, this.aiFlash - dt * 10);
      this.aiMesh.material.emissiveIntensity = 0.4 + this.aiFlash * 0.8;
    }
  }
}
