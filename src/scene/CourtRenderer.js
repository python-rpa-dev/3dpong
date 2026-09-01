import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CourtRenderer {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const { width, depth, wallHeight, netHeight } = CONFIG.court;
    const hw = width / 2;
    const hd = depth / 2;

    // Floor with grid texture
    const floorTexture = this.createFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.group.add(floor);
    this.floorMat = floorMat;

    // Side walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.wall,
      roughness: 0.6,
      metalness: 0.2,
    });
    this.wallMat = wallMat;
    this.baseWallColor = new THREE.Color(CONFIG.colors.wall);

    // Left wall
    const leftWallGeo = new THREE.BoxGeometry(0.3, wallHeight, depth);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-hw - 0.15, wallHeight / 2, 0);
    this.group.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
    rightWall.position.set(hw + 0.15, wallHeight / 2, 0);
    this.group.add(rightWall);

    // Back wall (behind opponent)
    const backWallGeo = new THREE.BoxGeometry(width + 0.6, wallHeight, 0.3);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, wallHeight / 2, hd + 0.15);
    this.group.add(backWall);

    // Front edge (glowing line behind player)
    const edgeGeo = new THREE.BoxGeometry(width, 0.05, 0.05);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.playerPaddle,
      transparent: true,
      opacity: 0.6,
    });
    const frontEdge = new THREE.Mesh(edgeGeo, edgeMat);
    frontEdge.position.set(0, 0.025, -hd);
    this.group.add(frontEdge);
    this.edgeMat = edgeMat;

    // Net (translucent plane at center)
    const netGeo = new THREE.PlaneGeometry(width, netHeight);
    const netMat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.net,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const net = new THREE.Mesh(netGeo, netMat);
    this.netMat = netMat;
    net.position.set(0, netHeight / 2, 0);
    this.group.add(net);

    // Net vertical lines
    const lineMat = new THREE.LineBasicMaterial({
      color: CONFIG.colors.net,
      transparent: true,
      opacity: 0.15,
    });
    this.lineMat = lineMat;
    const lineCount = 20;
    for (let i = 0; i <= lineCount; i++) {
      const x = -hw + (i / lineCount) * width;
      const points = [
        new THREE.Vector3(x, 0, 0),
        new THREE.Vector3(x, netHeight, 0),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMat);
      this.group.add(line);
    }

    // Net top bar
    const barGeo = new THREE.BoxGeometry(width, 0.08, 0.08);
    const barMat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.net,
      transparent: true,
      opacity: 0.3,
    });
    const topBar = new THREE.Mesh(barGeo, barMat);
    topBar.position.set(0, netHeight, 0);
    this.group.add(topBar);
    this.barMat = barMat;
    this.heat = 0;
    this.heatColor = new THREE.Color(0x8a1f4a);
    this.skin = null;
  }

  /**
   * Court "heats up" with rally length: floor glows, walls flush, edges brighten.
   */
  update(combo, dt = 1 / 60) {
    const target = Math.min(combo / 15, 1);
    this.heat += (target - this.heat) * Math.min(1, dt * 2.5);
    const h = this.heat;
    if (h < 0.005 && combo === 0) {
      // settle fully to base when rally resets
      this.floorMat.emissive.setRGB(0, 0, 0);
      this.wallMat.color.copy(this.baseWallColor);
      this.edgeMat.opacity = 0.6;
      this.barMat.opacity = 0.3;
      return;
    }
    // Heat color: deep magenta-orange glow
    this.floorMat.emissive.setRGB(0.45 * h, 0.08 * h, 0.25 * h);
    this.floorMat.emissiveIntensity = 0.6;
    this.wallMat.color.copy(this.baseWallColor).lerp(this.heatColor, h * 0.7);
    this.edgeMat.opacity = 0.6 + h * 0.4;
    this.barMat.opacity = 0.3 + h * 0.5;
  }

  /** Apply a court skin (palette variant); null-ish input resets to the default look. */
  setSkin(skin) {
    const c = (skin && skin.colors) || {};
    this.skin = skin || null;
    this.baseWallColor.set(c.wall ?? CONFIG.colors.wall);
    this.wallMat.color.copy(this.baseWallColor);
    const netColor = new THREE.Color(c.net ?? CONFIG.colors.net);
    this.netMat.color.copy(netColor);
    this.lineMat.color.copy(netColor);
    this.barMat.color.copy(netColor);
    this.edgeMat.color.set(c.edge ?? CONFIG.colors.playerPaddle);
    this.heatColor.set(c.heat ?? 0x8a1f4a);
    const texture = this.createFloorTexture(c.floorTop ?? '#1a1a3e', c.floorBottom ?? '#2d1b4e');
    if (this.floorMat.map) this.floorMat.map.dispose();
    this.floorMat.map = texture;
    this.floorMat.needsUpdate = true;
  }

  createFloorTexture(top = '#1a1a3e', bottom = '#2d1b4e') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#3a3a6e';
    ctx.lineWidth = 1;
    const cols = 10;
    const rows = 15;
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      const y = (i / rows) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = '#4a4a8e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
}
