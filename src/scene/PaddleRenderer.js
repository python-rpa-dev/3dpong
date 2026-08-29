import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class PaddleRenderer {
  constructor(scene) {
    this.scene = scene;
    this.playerFlash = 0;
    this.aiFlash = 0;
    this.playerPop = 0;
    this.aiPop = 0;

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
    this.playerPop = 1.0;
  }

  flashAI() {
    this.aiFlash = 1.0;
    this.aiPop = 1.0;
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

    // Width scaling from powerup effects + impact pop (squash/stretch on hit)
    const pw = (playerPaddle.width || CONFIG.paddle.width) / CONFIG.paddle.width;
    const aw = (aiPaddle.width || CONFIG.paddle.width) / CONFIG.paddle.width;
    this.playerPop = Math.max(0, this.playerPop - dt * 6);
    this.aiPop = Math.max(0, this.aiPop - dt * 6);
    const pPop = 1 + this.playerPop * 0.35;
    const aPop = 1 + this.aiPop * 0.35;
    this.playerMesh.scale.set(pw * (1 + this.playerPop * 0.15), pPop, 1 + this.playerPop * 0.25);
    this.aiMesh.scale.set(aw * (1 + this.aiPop * 0.15), aPop, 1 + this.aiPop * 0.25);

    // Flash decay + frozen tint
    if (this.playerFlash > 0) {
      this.playerFlash = Math.max(0, this.playerFlash - dt * 10);
      this.playerMesh.material.emissiveIntensity = 0.4 + this.playerFlash * 0.8;
    }
    if (this.aiFlash > 0) {
      this.aiFlash = Math.max(0, this.aiFlash - dt * 10);
      this.aiMesh.material.emissiveIntensity = 0.4 + this.aiFlash * 0.8;
    }
    this.playerMesh.material.emissive.set(
      playerPaddle.frozen ? 0x88ddff : CONFIG.colors.playerPaddle
    );
    this.aiMesh.material.emissive.set(
      aiPaddle.frozen ? 0x88ddff : CONFIG.colors.opponentPaddle
    );
  }
}
