import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Effects } from '../src/scene/Effects.js';
import { BallRenderer } from '../src/scene/BallRenderer.js';
import { CONFIG } from '../src/config.js';
import { DEFAULTS } from '../src/settings/Settings.js';
import { FakeStorage } from './helpers.js';

const noop = () => {};
const el = () => ({
  classList: { add: noop, remove: noop },
  addEventListener: noop,
  style: {},
  value: '100',
  checked: false,
  textContent: '',
  innerHTML: '',
  setAttribute: noop,
  offsetWidth: 0,
});

let UI;

async function loadUI() {
  const elements = {};
  globalThis.document = { getElementById: (id) => (elements[id] ??= el()) };
  globalThis.window = { addEventListener: noop, innerWidth: 1280, innerHeight: 720 };
  if (!UI) ({ UI } = await import('../src/ui/UI.js'));
}

describe('accessibility', () => {
  describe('settings defaults', () => {
    it('ships shake/colorblind/sound defaults', () => {
      expect(DEFAULTS.shakeIntensity).toBe(1);
      expect(DEFAULTS.cbTrail).toBe(false);
      expect(DEFAULTS.soundOn).toBe(true);
    });
  });

  describe('screen shake intensity', () => {
    function makeEffects() {
      const scene = new THREE.Scene();
      const inner = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
      return new Effects(scene, { camera: inner });
    }

    it('scales magnitude by the shake scale', () => {
      const effects = makeEffects();
      effects.setShakeScale(() => 0.5);
      effects.triggerShake(2, 0.15);
      expect(effects.shakeMagnitude).toBeCloseTo(1);
    });

    it('off means zero magnitude', () => {
      const effects = makeEffects();
      effects.setShakeScale(() => 0);
      effects.triggerShake(3, 0.2);
      expect(effects.shakeMagnitude).toBe(0);
    });

    it('ignores garbage scales', () => {
      const effects = makeEffects();
      effects.setShakeScale(() => NaN);
      effects.triggerShake(2, 0.1);
      expect(effects.shakeMagnitude).toBeCloseTo(2);
    });
  });

  describe('colorblind trail palette', () => {
    it('defaults to the standard combo ramp and switches on request', () => {
      const scene = new THREE.Scene();
      const renderer = new BallRenderer(scene);
      expect(renderer.trailPalette).toBe(CONFIG.comboColors);
      renderer.setTrailPalette(CONFIG.comboColorsCB);
      expect(renderer.trailPalette).toBe(CONFIG.comboColorsCB);
      renderer.setTrailPalette(null); // invalid input ignored
      expect(renderer.trailPalette).toBe(CONFIG.comboColorsCB);
    });

    it('Okabe-Ito ramp has the same step count', () => {
      expect(CONFIG.comboColorsCB.length).toBe(CONFIG.comboColors.length);
    });
  });

  describe('master sound hotkey', () => {
    beforeEach(async () => {
      globalThis.localStorage = new FakeStorage();
      await loadUI();
    });

    it('M toggles soundOn and persists', async () => {
      const { Game } = await import('../src/game/Game.js');
      const { Settings } = await import('../src/settings/Settings.js');
      const settings = new Settings();
      const game = new Game(settings);
      const ui = new UI(game, settings);
      expect(settings.get('soundOn')).toBe(true);
      ui.onKeyDown({ key: 'm', preventDefault: noop });
      expect(settings.get('soundOn')).toBe(false);
      expect(JSON.parse(globalThis.localStorage.getItem('pong3d_settings')).soundOn).toBe(false);
      ui.onKeyDown({ key: 'M', preventDefault: noop });
      expect(settings.get('soundOn')).toBe(true);
    });
  });
});
