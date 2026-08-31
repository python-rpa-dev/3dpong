import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { COURT_SKINS, resolveCourtSkin, CONFIG } from '../src/config.js';

function installCanvasStub() {
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createLinearGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
      }),
    }),
  };
}

describe('court skins', () => {
  describe('resolveCourtSkin', () => {
    it('falls back to default for unknown ids', () => {
      expect(resolveCourtSkin('nope')).toBe(COURT_SKINS[0]);
      expect(resolveCourtSkin(undefined)).toBe(COURT_SKINS[0]);
    });

    it('locks gated skins until the achievement is earned', () => {
      const sunset = COURT_SKINS.find((s) => s.id === 'sunset');
      expect(resolveCourtSkin('sunset')).toBe(COURT_SKINS[0]);
      expect(resolveCourtSkin('sunset', (id) => id === sunset.unlock)).toBe(sunset);
    });

    it('default skin never requires an unlock', () => {
      expect(resolveCourtSkin('default', () => false).id).toBe('default');
    });
  });

  describe('CourtRenderer.setSkin', () => {
    let CourtRenderer;
    beforeEach(async () => {
      installCanvasStub();
      ({ CourtRenderer } = await import('../src/scene/CourtRenderer.js'));
    });

    it('recolors walls, net and floor texture', () => {
      const scene = new THREE.Scene();
      const court = new CourtRenderer(scene);
      const oldMap = court.floorMat.map;
      const sunset = COURT_SKINS.find((s) => s.id === 'sunset');
      court.setSkin(sunset);
      expect(court.skin).toBe(sunset);
      expect(court.baseWallColor.getHex()).toBe(sunset.colors.wall);
      expect(court.netMat.color.getHex()).toBe(sunset.colors.net);
      expect(court.barMat.color.getHex()).toBe(sunset.colors.net);
      expect(court.heatColor.getHex()).toBe(sunset.colors.heat);
      expect(court.floorMat.map).not.toBe(oldMap);
    });

    it('falls back to base colors for the default skin', () => {
      const scene = new THREE.Scene();
      const court = new CourtRenderer(scene);
      court.setSkin(COURT_SKINS.find((s) => s.id === 'toxic'));
      court.setSkin(COURT_SKINS[0]);
      expect(court.baseWallColor.getHex()).toBe(new THREE.Color(CONFIG.colors.wall).getHex());
      expect(court.netMat.color.getHex()).toBe(new THREE.Color(CONFIG.colors.net).getHex());
      expect(court.heatColor.getHex()).toBe(new THREE.Color(0x8a1f4a).getHex());
      expect(court.skin).toBe(COURT_SKINS[0]);
    });

    it('ignores null-ish skins by resetting to base colors', () => {
      const scene = new THREE.Scene();
      const court = new CourtRenderer(scene);
      court.setSkin(COURT_SKINS.find((s) => s.id === 'abyss'));
      court.setSkin(null);
      expect(court.skin).toBe(null);
      expect(court.baseWallColor.getHex()).toBe(new THREE.Color(CONFIG.colors.wall).getHex());
    });
  });
});
